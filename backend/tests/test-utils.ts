import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, SnackCategory } from '@prisma/client';
import { prisma } from '../src/prisma.js';
import { env } from '../src/config/env.js';

export async function resetDatabase() {
  // Truncate dependent tables in safe order
  await prisma.vote.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.snack.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', saltRounds);
  const memberPasswordHash = await bcrypt.hash('MemberPass123!', saltRounds);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@snackoverflow.local',
      name: 'Pantry Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@snackoverflow.local',
      name: 'Alex Member',
      passwordHash: memberPasswordHash,
      role: Role.MEMBER,
    },
  });

  return { admin, member };
}

export function createTokenForUser(user: { id: string; email: string; name: string; role: Role }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export async function createTestSnack(overrides: {
  name?: string;
  category?: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
  isArchived?: boolean;
} = {}) {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  return await prisma.snack.create({
    data: {
      name: overrides.name || `Snack-${timestamp}-${randomSuffix}`,
      category: overrides.category || SnackCategory.SWEET,
      quantity: overrides.quantity !== undefined ? overrides.quantity : 10,
      lowStockThreshold: overrides.lowStockThreshold !== undefined ? overrides.lowStockThreshold : 5,
      isArchived: overrides.isArchived || false,
    },
  });
}
