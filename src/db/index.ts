import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as schema from './schema';

const DB_PATH = 'sqlite.db';

const sqlite = new DatabaseSync(DB_PATH);

export const db = drizzle(DB_PATH, { schema } as any);

function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  
  console.log('[DB] Checking and applying migrations...');
  
  try {
    migrate(db, { migrationsFolder });
    console.log('[DB] Migrations applied successfully.');
  } catch (error) {
    console.error('[DB_ERROR] Migration process failed:', error);
  }
}

runMigrations();
