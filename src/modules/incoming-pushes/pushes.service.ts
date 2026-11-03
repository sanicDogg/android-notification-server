import { db } from '../../db';
import { pushes } from '../../db/schema';
import { desc } from 'drizzle-orm';
import type { NotificationPayload } from '../../db/schema';

export class PushesService {
  async savePush(payload: NotificationPayload) {
    try {
      await db.insert(pushes).values(payload);
      console.log(`[DB] Saved push from ${payload.appName}`);
      return { success: true };
    } catch (error) {
      console.error('[DB_ERROR] Failed to save push:', error);
      throw error;
    }
  }

  async getAllPushes() {
    try {
      return await db.select().from(pushes).orderBy(desc(pushes.postTime));
    } catch (error) {
      console.error('[DB_ERROR] Failed to fetch pushes:', error);
      return [];
    }
  }
}
