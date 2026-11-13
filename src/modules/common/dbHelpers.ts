// common/dbHelpers.ts
import { db } from '../../db';
import { and, eq, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

export async function deleteEntityById<TTable extends SQLiteTable, TValue>(
  table: TTable,
  idColumn: SQLiteColumn,
  idValue: TValue,
  logLabel: string,
  extraCondition?: SQL,
): Promise<boolean> {
  try {
    const condition = extraCondition
      ? and(eq(idColumn, idValue), extraCondition)
      : eq(idColumn, idValue);

    const deleted = await db
      .delete(table)
      .where(condition)
      .returning({ id: idColumn });

    if (deleted.length > 0) {
      console.log(`[DB] Deleted ${logLabel} with ID: ${idValue}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[DB_ERROR] Failed to delete ${logLabel} ${idValue}:`, error);
    throw error;
  }
}

export async function deleteAllEntities<TTable extends SQLiteTable>(
  table: TTable,
  logLabel: string,
  condition?: SQL,
): Promise<void> {
  try {
    await db.delete(table).where(condition);
    console.log(`[DB] All ${logLabel} cleared from database`);
  } catch (error) {
    console.error(`[DB_ERROR] Failed to clear ${logLabel}:`, error);
    throw error;
  }
}
