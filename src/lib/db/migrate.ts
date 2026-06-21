import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client';

const db = getDb();
migrate(db, { migrationsFolder: './src/lib/db/migrations' });
console.log('✅ Migrations applied');