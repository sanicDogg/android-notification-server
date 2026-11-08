import { db } from '../../db';
import { pushes } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';
import type { NotificationPayload } from '../../db/schema';

export class PushesService {
  async savePush(payload: NotificationPayload) {
    try {
      await db
        .insert(pushes)
        .values(payload)
        .onConflictDoUpdate({
          target: pushes.id,
          set: payload,
        });
      console.log(`[DB] Updated or saved push from ${payload.appName}`);
      return { success: true };
    } catch (error) {
      console.error('[DB_ERROR] Failed to save push:', error);
      throw error;
    }
  }

  async getAllPushes() {
    try {
      return await db.select().from(pushes).orderBy(desc(pushes.postTime))
        .limit(50);
    } catch (error) {
      console.error('[DB_ERROR] Failed to fetch pushes:', error);
      return [];
    }
  }

  async deletePushById(id: string) {
    try {
      await db.delete(pushes).where(eq(pushes.id, id));
      console.log(`[DB] Deleted push with ID: ${id}`);
      return { success: true };
    } catch (error) {
      console.error(`[DB_ERROR] Failed to delete push ${id}:`, error);
      throw error;
    }
  }

  async deleteAllPushes() {
    try {
      await db.delete(pushes);
      console.log('[DB] All pushes cleared from database');
      return { success: true };
    } catch (error) {
      console.error('[DB_ERROR] Failed to clear pushes:', error);
      throw error;
    }
  }
}
