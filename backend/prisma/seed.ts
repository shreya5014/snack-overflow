import { PrismaClient, Role, SnackCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const existingCount = await prisma.snack.count();
  if (existingCount > 0) {
    console.log(`Database already contains ${existingCount} snacks. Skipping seed to preserve data.`);
    return;
  }

  // Clean existing data for clean seed runs
  await prisma.vote.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.snack.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo Users
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', saltRounds);
  const memberPasswordHash = await bcrypt.hash('MemberPass123!', saltRounds);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@snackoverflow.local',
      name: 'Priya Sharma',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@snackoverflow.local',
      name: 'Arjun Mehta',
      passwordHash: memberPasswordHash,
      role: Role.MEMBER,
    },
  });

  console.log(`Created users: Admin (${admin.email}), Member (${member.email})`);

  // 2. Indian Office Pantry Snack Menu
  // Categories: SAVOURY, SWEET, DRINK, HEALTHY_ISH
  const initialSnacks = [
    // ── SAVOURY ──────────────────────────────────────────────────────────────
    {
      name: 'Haldiram Aloo Bhujia',
      category: SnackCategory.SAVOURY,
      quantity: 20,
      lowStockThreshold: 5,
    },
    {
      name: 'Too Yumm Baked Veggie Sticks',
      category: SnackCategory.SAVOURY,
      quantity: 15,
      lowStockThreshold: 5,
    },
    {
      name: 'Kurkure Masala Munch',
      category: SnackCategory.SAVOURY,
      quantity: 18,
      lowStockThreshold: 6,
    },
    {
      name: 'Roasted Chana Dal (Spiced)',
      category: SnackCategory.SAVOURY,
      quantity: 3, // Running low initially
      lowStockThreshold: 5,
    },

    // ── SWEET ─────────────────────────────────────────────────────────────────
    {
      name: 'Makhana Caramel Crunch',
      category: SnackCategory.SWEET,
      quantity: 12,
      lowStockThreshold: 4,
    },
    {
      name: 'Cadbury Dairy Milk Silk',
      category: SnackCategory.SWEET,
      quantity: 10,
      lowStockThreshold: 3,
    },
    {
      name: 'Millet Oat Jaggery Cookie',
      category: SnackCategory.SWEET,
      quantity: 8,
      lowStockThreshold: 3,
    },

    // ── DRINKS ────────────────────────────────────────────────────────────────
    {
      name: 'Kokum Sharbat (200ml)',
      category: SnackCategory.DRINK,
      quantity: 14,
      lowStockThreshold: 4,
    },
    {
      name: 'Real Coconut Water (330ml)',
      category: SnackCategory.DRINK,
      quantity: 0, // Gone initially — popular!
      lowStockThreshold: 5,
    },
    {
      name: 'Chai Latte Tetra Pack',
      category: SnackCategory.DRINK,
      quantity: 9,
      lowStockThreshold: 3,
    },

    // ── HEALTHY-ISH ───────────────────────────────────────────────────────────
    {
      name: 'Mixed Nuts & Raisins Trail Mix',
      category: SnackCategory.HEALTHY_ISH,
      quantity: 16,
      lowStockThreshold: 5,
    },
    {
      name: 'RiteBite Protein Bar (Choco)',
      category: SnackCategory.HEALTHY_ISH,
      quantity: 11,
      lowStockThreshold: 4,
    },
    {
      name: 'Phool Makhana (Himalayan Pink Salt)',
      category: SnackCategory.HEALTHY_ISH,
      quantity: 7,
      lowStockThreshold: 3,
    },
    {
      name: 'Yoga Bar Granola & Millet Bar',
      category: SnackCategory.HEALTHY_ISH,
      quantity: 4, // Running low
      lowStockThreshold: 5,
    },
  ];

  for (const snackData of initialSnacks) {
    const snack = await prisma.snack.create({ data: snackData });

    // Initial inventory log for tracking initial restock
    if (snack.quantity > 0) {
      await prisma.inventoryLog.create({
        data: {
          snackId: snack.id,
          userId: admin.id,
          actionType: 'RESTOCK',
          quantityChanged: snack.quantity,
          previousQuantity: 0,
          newQuantity: snack.quantity,
        },
      });
    }
  }

  console.log(`Created ${initialSnacks.length} Indian pantry snacks with inventory logs.`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
