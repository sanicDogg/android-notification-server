import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

import { getDbPath, isProduction } from '../utils';

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as schema from './schema';

const DB_PATH = getDbPath();
console.log('[DB] Initializing SQLite database at:', DB_PATH);

const sqlite = new DatabaseSync(DB_PATH);

export const db = drizzle(DB_PATH, { schema } as any);

function runMigrations() {
  const migrationsFolder = isProduction
    ? import.meta.dirname
    : path.join(process.cwd(), 'drizzle');
  
  console.log('[DB] Applying migrations from: %s', migrationsFolder);

  try {
    if (!fs.existsSync(migrationsFolder) || !fs.statSync(migrationsFolder).isDirectory()) {
      console.warn('[DB_WARN] Migrations folder not found or is not a directory, skipping:', migrationsFolder);
      return;
    }
  } catch (error) {
    console.warn('[DB_WARN] Migrations folder check failed, skipping:', migrationsFolder);
    return;
  }

  try {
    migrate(db, { migrationsFolder });
    console.log('[DB] Migrations applied successfully.');
  } catch (error) {
    console.error('[DB_ERROR] Migration process failed:', error);
  }
}

runMigrations();
