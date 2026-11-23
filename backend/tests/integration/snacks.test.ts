import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/prisma.js';
import { resetDatabase, createTokenForUser, createTestSnack } from '../test-utils.js';
import { SnackCategory } from '@prisma/client';

describe('Module 2: Core Snacks, Inventory & Voting Integration Tests', () => {
  let adminUser: any;
  let memberUser: any;
  let adminToken: string;
  let memberToken: string;

  beforeEach(async () => {
    // Reset database to ensure clean, isolated state before each test suite
    const { admin, member } = await resetDatabase();
    adminUser = admin;
    memberUser = member;
    adminToken = createTokenForUser(admin);
    memberToken = createTokenForUser(member);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/snacks (Pantry Listing)', () => {
    it('requires authentication (401 when token missing)', async () => {
      const res = await request(app).get('/api/snacks');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns paginated non-archived snacks with derived stock status and vote counts', async () => {
      // Create test snacks with different stock levels
      await createTestSnack({ name: 'Stocked Snack', quantity: 15, lowStockThreshold: 5 });
      await createTestSnack({ name: 'Low Stock Snack', quantity: 3, lowStockThreshold: 5 });
      await createTestSnack({ name: 'Gone Snack', quantity: 0, lowStockThreshold: 5 });
      await createTestSnack({ name: 'Archived Snack', quantity: 10, isArchived: true });

      const res = await request(app)
        .get('/api/snacks?page=1&limit=10')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.totalCount).toBe(3); // Archived excluded
      expect(res.body.data).toHaveLength(3);

      const stocked = res.body.data.find((s: any) => s.name === 'Stocked Snack');
      const low = res.body.data.find((s: any) => s.name === 'Low Stock Snack');
      const gone = res.body.data.find((s: any) => s.name === 'Gone Snack');

      expect(stocked.derivedStatus).toBe('STOCKED');
      expect(low.derivedStatus).toBe('RUNNING_LOW');
      expect(gone.derivedStatus).toBe('GONE');
    });

    it('filters correctly by category', async () => {
      await createTestSnack({ name: 'Sweet Item', category: SnackCategory.SWEET });
      await createTestSnack({ name: 'Savoury Item', category: SnackCategory.SAVOURY });

      const res = await request(app)
        .get('/api/snacks?category=SWEET')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Sweet Item');
    });

    it('filters correctly by derived stock status', async () => {
      await createTestSnack({ name: 'In Stock', quantity: 10, lowStockThreshold: 3 });
      await createTestSnack({ name: 'Depleted', quantity: 0, lowStockThreshold: 3 });

      const res = await request(app)
        .get('/api/snacks?status=GONE')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Depleted');
    });

    it('filters correctly by search keyword (case-insensitive substring)', async () => {
      await createTestSnack({ name: 'Matcha Green Tea Drink', category: SnackCategory.DRINK });
      await createTestSnack({ name: 'Spicy Potato Wafers', category: SnackCategory.SAVOURY });

      const res = await request(app)
        .get('/api/snacks?search=tea')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Matcha Green Tea Drink');
    });

    it('handles pagination with page and limit', async () => {
      await createTestSnack({ name: 'Alpha Snack' });
      await createTestSnack({ name: 'Beta Snack' });
      await createTestSnack({ name: 'Gamma Snack' });

      const page1 = await request(app)
        .get('/api/snacks?page=1&limit=2')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.pagination.totalCount).toBe(3);
      expect(page1.body.pagination.totalPages).toBe(2);

      const page2 = await request(app)
        .get('/api/snacks?page=2&limit=2')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data).toHaveLength(1);
    });
  });

  describe('Admin Snack Management (CRUD & Soft Deletion)', () => {
    it('allows ADMIN to create a new snack with initial quantity and creates RESTOCK log', async () => {
      const res = await request(app)
        .post('/api/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Crispy Seaweed',
          category: SnackCategory.HEALTHY_ISH,
          quantity: 20,
          lowStockThreshold: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Crispy Seaweed');
      expect(res.body.data.quantity).toBe(20);

      // Verify activity log created transactionally
      const logs = await prisma.inventoryLog.findMany({
        where: { snackId: res.body.data.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].actionType).toBe('RESTOCK');
      expect(logs[0].quantityChanged).toBe(20);
    });

    it('rejects MEMBER from creating a snack with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/snacks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Snack',
          category: SnackCategory.SWEET,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects duplicate snack name with 409 DUPLICATE_SNACK_NAME', async () => {
      await createTestSnack({ name: 'Existing Unique Name' });

      const res = await request(app)
        .post('/api/snacks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Existing Unique Name',
          category: SnackCategory.SWEET,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_SNACK_NAME');
    });

    it('allows ADMIN to update a snack and preserves quantity', async () => {
      const snack = await createTestSnack({ name: 'Old Name', lowStockThreshold: 5 });

      const res = await request(app)
        .put(`/api/snacks/${snack.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Updated Name',
          lowStockThreshold: 8,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Updated Name');
      expect(res.body.data.lowStockThreshold).toBe(8);
    });

    it('soft-deletes a snack (isArchived = true) and removes it from normal pantry listing', async () => {
      const snack = await createTestSnack({ name: 'To Be Soft Deleted' });

      const deleteRes = await request(app)
        .delete(`/api/snacks/${snack.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isArchived).toBe(true);

      // Verify DB row still exists with isArchived = true (no hard delete)
      const dbRow = await prisma.snack.findUnique({ where: { id: snack.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow?.isArchived).toBe(true);

      // Verify omitted from GET /api/snacks
      const listRes = await request(app)
        .get('/api/snacks')
        .set('Authorization', `Bearer ${memberToken}`);

      const found = listRes.body.data.find((s: any) => s.id === snack.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Inventory Restocking', () => {
    it('allows ADMIN to restock snack and logs activity record transactionally', async () => {
      const snack = await createTestSnack({ quantity: 5 });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.snack.quantity).toBe(15);
      expect(res.body.data.log.actionType).toBe('RESTOCK');
      expect(res.body.data.log.previousQuantity).toBe(5);
      expect(res.body.data.log.newQuantity).toBe(15);
      expect(res.body.data.log.quantityChanged).toBe(10);
    });

    it('rejects MEMBER from restocking with 403 FORBIDDEN', async () => {
      const snack = await createTestSnack();

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/restock`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 5 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects negative or zero restock amount with 400 VALIDATION_ERROR', async () => {
      const snack = await createTestSnack();

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Inventory Consumption (Atomic & Concurrency-Safe)', () => {
    it('allows MEMBER to consume snack and records activity log transactionally', async () => {
      const snack = await createTestSnack({ quantity: 10 });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.snack.quantity).toBe(8);
      expect(res.body.data.log.actionType).toBe('CONSUMPTION');
      expect(res.body.data.log.quantityChanged).toBe(-2);
      expect(res.body.data.log.previousQuantity).toBe(10);
      expect(res.body.data.log.newQuantity).toBe(8);
    });

    it('rejects consumption exceeding available stock with 409 INSUFFICIENT_STOCK', async () => {
      const snack = await createTestSnack({ quantity: 2 });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 5 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Verify stock was untouched
      const dbSnack = await prisma.snack.findUnique({ where: { id: snack.id } });
      expect(dbSnack?.quantity).toBe(2);
    });

    it('rejects consumption of archived snack with 404 NOT_FOUND', async () => {
      const snack = await createTestSnack({ quantity: 10, isArchived: true });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects non-positive amount with 400 VALIDATION_ERROR', async () => {
      const snack = await createTestSnack({ quantity: 10 });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Voting System & Duplicate Prevention', () => {
    it('allows user to vote for a snack', async () => {
      const snack = await createTestSnack();

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbVote = await prisma.vote.findUnique({
        where: {
          user_snack_unique_vote: {
            userId: memberUser.id,
            snackId: snack.id,
          },
        },
      });
      expect(dbVote).not.toBeNull();
    });

    it('prevents duplicate votes for the same snack with 409 ALREADY_VOTED and ensures only one record in database', async () => {
      const snack = await createTestSnack();

      // 1. First vote request succeeds with 201
      const firstRes = await request(app)
        .post(`/api/snacks/${snack.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);

      // 2. Second vote request for the exact same snack is rejected by unique database constraint
      const secondRes = await request(app)
        .post(`/api/snacks/${snack.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toEqual({
        error: {
          code: 'ALREADY_VOTED',
          message: 'You have already voted for this snack',
        },
      });

      // 3. Database verification: verify strictly one vote record exists for (userId, snackId)
      const voteRecords = await prisma.vote.findMany({
        where: {
          userId: memberUser.id,
          snackId: snack.id,
        },
      });
      expect(voteRecords).toHaveLength(1);
      expect(voteRecords[0].snackId).toBe(snack.id);
      expect(voteRecords[0].userId).toBe(memberUser.id);
    });

    it('prevents duplicate voting under simultaneous concurrent requests directly against the API', async () => {
      const snack = await createTestSnack();

      // Fire 2 concurrent vote requests from the same user for the same snack
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/snacks/${snack.id}/vote`)
          .set('Authorization', `Bearer ${memberToken}`),
        request(app)
          .post(`/api/snacks/${snack.id}/vote`)
          .set('Authorization', `Bearer ${memberToken}`),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error.code).toBe('ALREADY_VOTED');

      // Verify DB contains strictly one record
      const voteCount = await prisma.vote.count({
        where: { userId: memberUser.id, snackId: snack.id },
      });
      expect(voteCount).toBe(1);
    });

    it('rejects voting for an archived snack with 404 NOT_FOUND', async () => {
      const snack = await createTestSnack({ isArchived: true });

      const res = await request(app)
        .post(`/api/snacks/${snack.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Snack of the Week (Asia/Kolkata Calendar Week)', () => {
    it('returns the snack with highest votes in the current calendar week', async () => {
      const snackA = await createTestSnack({ name: 'Snack Alpha' });
      const snackB = await createTestSnack({ name: 'Snack Beta' });

      // Member votes for Snack B, Admin votes for Snack B (total 2 votes for B, 0 for A)
      await request(app)
        .post(`/api/snacks/${snackB.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      await request(app)
        .post(`/api/snacks/${snackB.id}/vote`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .get('/api/snacks/snack-of-the-week')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.snack).not.toBeNull();
      expect(res.body.data.snack.name).toBe('Snack Beta');
      expect(res.body.data.weeklyVoteCount).toBe(2);
      expect(res.body.data.weekWindow.timezone).toBe('Asia/Kolkata');
    });

    it('resolves ties deterministically (earliest vote in week, then alphabetical)', async () => {
      const snackX = await createTestSnack({ name: 'Apple Chips' });
      const snackY = await createTestSnack({ name: 'Banana Chips' });

      // Member votes for snackX at time T1
      await request(app)
        .post(`/api/snacks/${snackX.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Admin votes for snackY at time T2 (T2 > T1)
      await request(app)
        .post(`/api/snacks/${snackY.id}/vote`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Both have 1 vote. snackX should win deterministically because its vote occurred earlier
      const res = await request(app)
        .get('/api/snacks/snack-of-the-week')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.snack.name).toBe('Apple Chips');
      expect(res.body.data.weeklyVoteCount).toBe(1);
    });

    it('returns null snack when no votes exist during current week', async () => {
      await createTestSnack();

      const res = await request(app)
        .get('/api/snacks/snack-of-the-week')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.snack).toBeNull();
      expect(res.body.data.weeklyVoteCount).toBe(0);
    });
  });
});
