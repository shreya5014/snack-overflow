import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { resetDatabase, createTokenForUser, createTestSnack } from '../test-utils.js';

describe('Module 3: Inventory Concurrency & Race Condition Stress Tests', () => {
  let memberToken: string;

  beforeEach(async () => {
    const { member } = await resetDatabase();
    memberToken = createTokenForUser(member);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Assessment Core Requirement: 10 Simultaneous Consumptions on Stock = 3', () => {
    it('handles 10 simultaneous consumption requests on initial quantity 3 with exactly 3 successes, 7 HTTP 409s, final quantity 0, and 3 logs', async () => {
      // 1. Setup: Create test snack with initial quantity = 3
      const initialStock = 3;
      const snack = await createTestSnack({
        name: 'Concurrent Granola Bar',
        quantity: initialStock,
        lowStockThreshold: 1,
      });

      // 2. Generate 10 simultaneous requests using Promise.all
      const totalRequests = 10;
      const consumptionRequests = Array.from({ length: totalRequests }).map(() =>
        request(app)
          .post(`/api/snacks/${snack.id}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 1 })
      );

      // Execute all 10 requests concurrently against the live PostgreSQL database
      const responses = await Promise.all(consumptionRequests);

      // 3. Status Code Distributions
      const successes = responses.filter((res) => res.status === 200);
      const conflicts = responses.filter((res) => res.status === 409);

      // Assert exactly 3 requests succeeded
      expect(successes).toHaveLength(3);

      // Assert exactly 7 requests failed with HTTP 409 INSUFFICIENT_STOCK
      expect(conflicts).toHaveLength(7);

      // Verify all failed responses have the exact standardized error format
      conflicts.forEach((res) => {
        expect(res.body).toEqual({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: expect.stringMatching(/insufficient stock available/i),
          },
        });
      });

      // 4. Database Invariant Checks
      const finalSnack = await prisma.snack.findUnique({
        where: { id: snack.id },
      });
      expect(finalSnack).not.toBeNull();
      // Final quantity must be exactly 0 (no overselling, no negative stock)
      expect(finalSnack!.quantity).toBe(0);

      // 5. Activity Log Invariant Checks
      const logs = await prisma.inventoryLog.findMany({
        where: { snackId: snack.id, actionType: 'CONSUMPTION' },
        orderBy: { createdAt: 'asc' },
      });

      // Exactly 3 CONSUMPTION activity records created for the 3 successful requests
      expect(logs).toHaveLength(3);

      // Verify each log accurately represents a 1-unit consumption
      logs.forEach((log) => {
        expect(log.actionType).toBe('CONSUMPTION');
        expect(log.quantityChanged).toBe(-1);
        expect(log.previousQuantity - 1).toBe(log.newQuantity);
      });

      // Verify no duplicate logs or phantom records exist
      const totalQuantityDeducted = logs.reduce((sum, log) => sum + Math.abs(log.quantityChanged), 0);
      expect(totalQuantityDeducted).toBe(3);
    });
  });

  describe('Consistency Verification across Repeated Concurrent Executions', () => {
    it('reliably produces the exact 3-success / 7-conflict outcome across multiple repeated executions', async () => {
      // Repeat the exact test across 3 distinct snacks to guarantee determinism under load
      for (let run = 1; run <= 3; run++) {
        const snack = await createTestSnack({
          name: `Repeated Run Snack #${run}`,
          quantity: 3,
        });

        const requests = Array.from({ length: 10 }).map(() =>
          request(app)
            .post(`/api/snacks/${snack.id}/consume`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ amount: 1 })
        );

        const responses = await Promise.all(requests);

        const successes = responses.filter((r) => r.status === 200);
        const conflicts = responses.filter((r) => r.status === 409);

        expect(successes).toHaveLength(3);
        expect(conflicts).toHaveLength(7);

        const finalSnack = await prisma.snack.findUnique({ where: { id: snack.id } });
        expect(finalSnack?.quantity).toBe(0);

        const logs = await prisma.inventoryLog.findMany({
          where: { snackId: snack.id, actionType: 'CONSUMPTION' },
        });
        expect(logs).toHaveLength(3);
      }
    });
  });

  describe('Simultaneous Requests with Different Consumption Amounts', () => {
    it('correctly handles concurrent requests requesting varying amounts without overselling', async () => {
      // Initial stock: 5 units
      const snack = await createTestSnack({
        name: 'Heterogeneous Amount Snack',
        quantity: 5,
      });

      // Concurrent requests requesting [2, 3, 2, 3] units simultaneously (total requested = 10)
      const requestedAmounts = [2, 3, 2, 3];
      const requests = requestedAmounts.map((amount) =>
        request(app)
          .post(`/api/snacks/${snack.id}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount })
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      // Only requests summing up to exactly 5 can succeed (e.g. 2 + 3 = 5)
      const successfulConsumedUnits = successes.reduce((sum, res) => sum + res.body.data.log.quantityChanged, 0);
      expect(Math.abs(successfulConsumedUnits)).toBe(5);

      // Conflicts occurred for the remaining requested units
      expect(conflicts.length).toBeGreaterThan(0);
      conflicts.forEach((res) => {
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
      });

      // Final stock in database must be exactly 0
      const dbSnack = await prisma.snack.findUnique({ where: { id: snack.id } });
      expect(dbSnack?.quantity).toBe(0);

      // Verify audit logs match successful requests exactly
      const logs = await prisma.inventoryLog.findMany({
        where: { snackId: snack.id, actionType: 'CONSUMPTION' },
      });
      expect(logs).toHaveLength(successes.length);
    });
  });

  describe('Audit Log Isolation & Rollback Verification', () => {
    it('guarantees failed consumption requests never create orphan activity logs', async () => {
      // Initial stock: 1 unit
      const snack = await createTestSnack({
        name: 'Single Unit Snack',
        quantity: 1,
      });

      // 5 concurrent requests for 1 unit
      const requests = Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/snacks/${snack.id}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 1 })
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(4);

      // Query database for all logs created for this snack
      const allLogs = await prisma.inventoryLog.findMany({
        where: { snackId: snack.id },
      });

      // ONLY 1 log should exist; failed transactions were rolled back completely
      expect(allLogs).toHaveLength(1);
      expect(allLogs[0].actionType).toBe('CONSUMPTION');
      expect(allLogs[0].previousQuantity).toBe(1);
      expect(allLogs[0].newQuantity).toBe(0);
    });

    it('guarantees transactional consistency between snack quantity and activity log transitions', async () => {
      const initialStock = 4;
      const snack = await createTestSnack({
        name: 'Transactional Consistency Snack',
        quantity: initialStock,
      });

      // Fire 6 concurrent requests for 1 unit
      const requests = Array.from({ length: 6 }).map(() =>
        request(app)
          .post(`/api/snacks/${snack.id}/consume`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ amount: 1 })
      );

      await Promise.all(requests);

      const logs = await prisma.inventoryLog.findMany({
        where: { snackId: snack.id, actionType: 'CONSUMPTION' },
        orderBy: { createdAt: 'asc' },
      });

      expect(logs).toHaveLength(initialStock);

      // Verify each log record's mathematical integrity: previousQuantity + quantityChanged === newQuantity
      logs.forEach((log) => {
        expect(log.previousQuantity + log.quantityChanged).toBe(log.newQuantity);
      });

      const finalSnack = await prisma.snack.findUnique({ where: { id: snack.id } });
      expect(finalSnack?.quantity).toBe(0);
    });
  });
});
