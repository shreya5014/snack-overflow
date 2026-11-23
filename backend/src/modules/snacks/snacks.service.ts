import { Prisma, Snack, SnackCategory } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { AppError } from '../../errors/AppError.js';
import { getKolkataCalendarWeekRange } from '../../utils/date.js';
import {
  CreateSnackInput,
  QuerySnacksInput,
  UpdateSnackInput,
} from './snacks.validation.js';

export interface SnackWithDetails extends Snack {
  voteCount: number;
  derivedStatus: 'STOCKED' | 'RUNNING_LOW' | 'GONE';
  hasVoted?: boolean;
}

export async function listSnacks(
  query: QuerySnacksInput,
  currentUserId?: string
): Promise<{
  items: SnackWithDetails[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const offset = (page - 1) * limit;

  // Build SQL filters dynamically to allow derived column comparisons
  const conditions: Prisma.Sql[] = [Prisma.sql`s."isArchived" = false`];

  if (query.search && query.search.trim() !== '') {
    const searchPattern = `%${query.search.trim()}%`;
    conditions.push(Prisma.sql`s.name ILIKE ${searchPattern}`);
  }

  if (query.category) {
    conditions.push(Prisma.sql`s.category = ${query.category}::"SnackCategory"`);
  }

  if (query.status) {
    if (query.status === 'GONE') {
      conditions.push(Prisma.sql`s.quantity = 0`);
    } else if (query.status === 'RUNNING_LOW') {
      conditions.push(Prisma.sql`s.quantity > 0 AND s.quantity <= s."lowStockThreshold"`);
    } else if (query.status === 'STOCKED') {
      conditions.push(Prisma.sql`s.quantity > s."lowStockThreshold"`);
    }
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  // 1. Get total count for pagination
  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count
    FROM "Snack" s
    ${whereClause}
  `;
  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // 2. Fetch page results with vote aggregation & derived status
  const currentUserIdVal = currentUserId || null;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: SnackCategory;
      quantity: number;
      lowStockThreshold: number;
      isArchived: boolean;
      createdAt: Date;
      updatedAt: Date;
      voteCount: number;
      derivedStatus: 'STOCKED' | 'RUNNING_LOW' | 'GONE';
      hasVoted: boolean;
    }>
  >`
    SELECT 
      s.id,
      s.name,
      s.category,
      s.quantity,
      s."lowStockThreshold",
      s."isArchived",
      s."createdAt",
      s."updatedAt",
      COUNT(v.id)::int AS "voteCount",
      CASE 
        WHEN s.quantity = 0 THEN 'GONE'
        WHEN s.quantity <= s."lowStockThreshold" THEN 'RUNNING_LOW'
        ELSE 'STOCKED'
      END AS "derivedStatus",
      COALESCE(BOOL_OR(v."userId" = ${currentUserIdVal}), false) AS "hasVoted"
    FROM "Snack" s
    LEFT JOIN "Vote" v ON v."snackId" = s.id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    items: rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
}

export async function getSnackById(id: string): Promise<SnackWithDetails> {
  const rows = await prisma.$queryRaw<
    Array<Snack & { voteCount: number; derivedStatus: 'STOCKED' | 'RUNNING_LOW' | 'GONE' }>
  >`
    SELECT 
      s.*,
      COUNT(v.id)::int AS "voteCount",
      CASE 
        WHEN s.quantity = 0 THEN 'GONE'
        WHEN s.quantity <= s."lowStockThreshold" THEN 'RUNNING_LOW'
        ELSE 'STOCKED'
      END AS "derivedStatus"
    FROM "Snack" s
    LEFT JOIN "Vote" v ON v."snackId" = s.id
    WHERE s.id = ${id} AND s."isArchived" = false
    GROUP BY s.id
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Snack not found or is archived');
  }

  return rows[0];
}

export async function createSnack(input: CreateSnackInput, adminUserId: string): Promise<Snack> {
  // Check unique name
  const existing = await prisma.snack.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_SNACK_NAME', `A snack named "${input.name}" already exists`);
  }

  return await prisma.$transaction(async (tx) => {
    const snack = await tx.snack.create({
      data: {
        name: input.name,
        category: input.category,
        quantity: input.quantity,
        lowStockThreshold: input.lowStockThreshold,
        isArchived: false,
      },
    });

    if (snack.quantity > 0) {
      await tx.inventoryLog.create({
        data: {
          snackId: snack.id,
          userId: adminUserId,
          actionType: 'RESTOCK',
          quantityChanged: snack.quantity,
          previousQuantity: 0,
          newQuantity: snack.quantity,
        },
      });
    }

    return snack;
  });
}

export async function updateSnack(id: string, input: UpdateSnackInput): Promise<Snack> {
  const existing = await prisma.snack.findUnique({
    where: { id },
  });

  if (!existing || existing.isArchived) {
    throw new AppError(404, 'NOT_FOUND', 'Snack not found or is archived');
  }

  if (input.name && input.name !== existing.name) {
    const nameConflict = await prisma.snack.findUnique({
      where: { name: input.name },
    });
    if (nameConflict && nameConflict.id !== id) {
      throw new AppError(409, 'DUPLICATE_SNACK_NAME', `A snack named "${input.name}" already exists`);
    }
  }

  return await prisma.snack.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      lowStockThreshold: input.lowStockThreshold,
    },
  });
}

/**
 * Strict soft-deletion: sets isArchived = true.
 * Preserves all historical inventory logs and votes without physical deletion.
 */
export async function softDeleteSnack(id: string): Promise<Snack> {
  const existing = await prisma.snack.findUnique({
    where: { id },
  });

  if (!existing || existing.isArchived) {
    throw new AppError(404, 'NOT_FOUND', 'Snack not found or is already archived');
  }

  return await prisma.snack.update({
    where: { id },
    data: { isArchived: true },
  });
}

/**
 * Concurrency-safe Restock action inside an interactive transaction.
 */
export async function restockSnack(id: string, amount: number, adminUserId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check existing snack
    const existing = await tx.snack.findUnique({
      where: { id },
    });

    if (!existing || existing.isArchived) {
      throw new AppError(404, 'NOT_FOUND', 'Snack not found or is archived');
    }

    const previousQuantity = existing.quantity;
    const newQuantity = previousQuantity + amount;

    // 2. Update stock atomically
    const updated = await tx.snack.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    // 3. Log activity record within same transaction
    const log = await tx.inventoryLog.create({
      data: {
        snackId: id,
        userId: adminUserId,
        actionType: 'RESTOCK',
        quantityChanged: amount,
        previousQuantity,
        newQuantity,
      },
    });

    return { snack: updated, log };
  });
}

/**
 * Concurrency-safe atomic consumption inside an interactive transaction.
 * Uses atomic conditional SQL update to ensure quantity cannot drop below requested amount.
 */
export async function consumeSnack(id: string, amount: number, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Atomic conditional decrement
    const updatedRows = await tx.$queryRaw<Snack[]>`
      UPDATE "Snack"
      SET quantity = quantity - ${amount},
          "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isArchived" = false
        AND quantity >= ${amount}
      RETURNING *;
    `;

    // 2. If 0 rows updated, verify whether snack exists/archived or stock is insufficient
    if (!updatedRows || updatedRows.length === 0) {
      const snack = await tx.snack.findUnique({ where: { id } });
      if (!snack || snack.isArchived) {
        throw new AppError(404, 'NOT_FOUND', 'Snack not found or is archived');
      }
      throw new AppError(
        409,
        'INSUFFICIENT_STOCK',
        `Insufficient stock available. Remaining quantity is ${snack.quantity}, requested ${amount}.`
      );
    }

    const updatedSnack = updatedRows[0];
    const previousQuantity = updatedSnack.quantity + amount;

    // 3. Create transactional activity log
    const log = await tx.inventoryLog.create({
      data: {
        snackId: id,
        userId,
        actionType: 'CONSUMPTION',
        quantityChanged: -amount,
        previousQuantity,
        newQuantity: updatedSnack.quantity,
      },
    });

    return { snack: updatedSnack, log };
  });
}

/**
 * Concurrency-safe atomic batch checkout inside a single interactive transaction.
 * Sorts items by ID for deterministic locking order (deadlock prevention).
 * Either ALL items in the cart are successfully decremented and logged, or transaction is rolled back.
 */
export async function checkoutSnacks(items: { snackId: string; amount: number }[], userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Sort items by ID for deterministic locking order (deadlock prevention)
    const sortedItems = [...items].sort((a, b) => a.snackId.localeCompare(b.snackId));
    const results = [];

    for (const item of sortedItems) {
      const updatedRows = await tx.$queryRaw<Snack[]>`
        UPDATE "Snack"
        SET quantity = quantity - ${item.amount},
            "updatedAt" = NOW()
        WHERE id = ${item.snackId}
          AND "isArchived" = false
          AND quantity >= ${item.amount}
        RETURNING *;
      `;

      if (!updatedRows || updatedRows.length === 0) {
        const snack = await tx.snack.findUnique({ where: { id: item.snackId } });
        if (!snack || snack.isArchived) {
          throw new AppError(404, 'NOT_FOUND', `Snack not found or is archived`);
        }
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Insufficient stock for "${snack.name}". Only ${snack.quantity} remaining, requested ${item.amount}.`
        );
      }

      const updatedSnack = updatedRows[0];
      const previousQuantity = updatedSnack.quantity + item.amount;

      const log = await tx.inventoryLog.create({
        data: {
          snackId: item.snackId,
          userId,
          actionType: 'CONSUMPTION',
          quantityChanged: -item.amount,
          previousQuantity,
          newQuantity: updatedSnack.quantity,
        },
      });

      results.push({ snack: updatedSnack, log });
    }

    return results;
  });
}

/**
 * Vote for snack with database-level duplicate prevention.
 */
export async function voteForSnack(snackId: string, userId: string) {
  const snack = await prisma.snack.findUnique({
    where: { id: snackId },
  });

  if (!snack || snack.isArchived) {
    throw new AppError(404, 'NOT_FOUND', 'Snack not found or is archived');
  }

  try {
    const vote = await prisma.vote.create({
      data: {
        snackId,
        userId,
      },
    });
    return vote;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'ALREADY_VOTED', 'You have already voted for this snack');
    }
    throw err;
  }
}

/**
 * Calculates Snack of the Week using the current calendar week in Asia/Kolkata
 * with deterministic tie-breaking (voteCount DESC, earliest vote in week ASC, name ASC, id ASC).
 */
export async function getSnackOfTheWeek() {
  const { startOfWeek, endOfWeek } = getKolkataCalendarWeekRange();

  const winningRows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: SnackCategory;
      quantity: number;
      lowStockThreshold: number;
      weeklyVoteCount: number;
    }>
  >`
    SELECT 
      s.id,
      s.name,
      s.category,
      s.quantity,
      s."lowStockThreshold",
      COUNT(v.id)::int AS "weeklyVoteCount"
    FROM "Snack" s
    JOIN "Vote" v ON v."snackId" = s.id
    WHERE s."isArchived" = false
      AND v."createdAt" >= ${startOfWeek}
      AND v."createdAt" <= ${endOfWeek}
    GROUP BY s.id
    ORDER BY 
      "weeklyVoteCount" DESC,
      MIN(v."createdAt") ASC,
      s.name ASC,
      s.id ASC
    LIMIT 1;
  `;

  const winner = winningRows[0] || null;

  return {
    snack: winner,
    weeklyVoteCount: winner?.weeklyVoteCount ?? 0,
    weekWindow: {
      timezone: 'Asia/Kolkata',
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
    },
  };
}
