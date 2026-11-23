import { prisma } from '../src/prisma.js';

async function main() {
  console.log('--- Verifying PostgreSQL CHECK Constraint on "Snack" table ---');

  // 1. Query PostgreSQL system catalogs for constraints on "Snack"
  const constraints = await prisma.$queryRaw<Array<{ conname: string; contype: string; def: string }>>`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'Snack';
  `;

  console.log('Live constraints on "Snack":', constraints);

  const checkConstraint = constraints.find((c) => c.conname === 'snack_quantity_non_negative');
  if (!checkConstraint) {
    throw new Error('CHECK constraint "snack_quantity_non_negative" NOT FOUND in database!');
  }
  console.log('✓ Found CHECK constraint in catalog:', checkConstraint);

  // 2. Active Verification: Attempt to violate CHECK constraint with direct raw SQL
  console.log('--- Testing active violation of CHECK constraint (setting quantity = -5) ---');
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Snack" (id, name, category, quantity, "lowStockThreshold", "isArchived", "createdAt", "updatedAt")
      VALUES ('test-negative-id', 'Illegal Negative Snack', 'SWEET', -5, 5, false, NOW(), NOW())
    `);
    throw new Error('CHECK constraint FAILED to prevent negative quantity!');
  } catch (err: any) {
    if (err.message?.includes('snack_quantity_non_negative') || err.message?.includes('violates check constraint')) {
      console.log('✓ Active violation correctly rejected by PostgreSQL CHECK constraint!');
      console.log('Database error captured:', err.message.split('\n')[0]);
    } else {
      throw err;
    }
  }

  console.log('All constraint checks PASSED successfully.');
}

main()
  .catch((e) => {
    console.error('Constraint verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
