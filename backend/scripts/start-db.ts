import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

const dataDir = path.resolve(__dirname, '../.pgdata');

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  console.log('Initializing embedded postgres if needed...');
  await pg.initialise();

  console.log('Starting PostgreSQL server on port 5432...');
  await pg.start();

  try {
    console.log('Creating database "snack_overflow" if not exists...');
    await pg.createDatabase('snack_overflow');
  } catch (err: any) {
    // Database might already exist
    console.log('Database notice:', err.message || err);
  }

  console.log('PostgreSQL is running at postgresql://postgres:password@localhost:5432/snack_overflow');
}

main().catch((err) => {
  console.error('Failed to start postgres:', err);
  process.exit(1);
});
