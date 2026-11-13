import { db } from '../../db';
import { clipboardHistory, deviceState } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';
import { SINGLE_DEVICE_ID } from '../common/deviceState.shared';
import type { ClipboardEntry, IncomingDeviceState } from '../../db/schema';

export class DeviceStateService {
  async saveDeviceState(payload: IncomingDeviceState) {
    try {
      const { clipboardText, clipboardCapturedAt, ...cleanState } = payload;

      const dataToSave = {
        ...cleanState,
        deviceId: SINGLE_DEVICE_ID,
      };

      const { deviceId, ...fieldsToUpdate } = dataToSave;

      await db
        .insert(deviceState)
        .values(dataToSave)
        .onConflictDoUpdate({
          target: deviceState.deviceId,
          set: fieldsToUpdate,
        });

      let newClipboardEntry = null;
      if (clipboardText) {
        newClipboardEntry = await this.saveClipboardHistory(
          SINGLE_DEVICE_ID,
          clipboardText,
          clipboardCapturedAt ?? payload.timestamp,
        );
      }

      console.log(`[DB] Updated state for the single device`);
      return { success: true, cleanState, newClipboardEntry };
    } catch (error) {
      console.error('[DB_ERROR] Failed to save device state:', error);
      throw error;
    }
  }

  private async saveClipboardHistory(
    deviceId: string,
    text: string,
    capturedAt: string | number,
  ): Promise<ClipboardEntry | null> {
    const parsedTime = typeof capturedAt === 'string'
      ? Date.parse(capturedAt)
      : capturedAt;
    const normalizedCapturedAt = Number.isNaN(parsedTime)
      ? Date.now()
      : parsedTime;

    const [lastEntry] = await db
      .select()
      .from(clipboardHistory)
      .where(eq(clipboardHistory.deviceId, deviceId))
      .orderBy(desc(clipboardHistory.id))
      .limit(1);

    if (lastEntry?.text === text) {
      return null; // if no change, skip
    }

    const [inserted] = await db
      .insert(clipboardHistory)
      .values({
        deviceId,
        text,
        capturedAt: normalizedCapturedAt,
      })
      .returning();

    if (inserted === undefined) {
      console.error('[DB] Cannot save new clipboard entry');
      return null;
    }

    console.log('[DB] Saved new clipboard entry');
    return inserted;
  }

  async getClipboardHistory(limit = 50) {
    return await db
      .select()
      .from(clipboardHistory)
      .where(eq(clipboardHistory.deviceId, SINGLE_DEVICE_ID))
      .orderBy(desc(clipboardHistory.id))
      .limit(limit);
  }

  async getSingleDeviceState() {
    try {
      const result = await db
        .select()
        .from(deviceState)
        .where(eq(deviceState.deviceId, SINGLE_DEVICE_ID));

      return result[0] || null;
    } catch (error) {
      console.error('[DB_ERROR] Failed to fetch device state:', error);
      return null;
    }
  }

  async deleteDeviceState() {
    try {
      await db.delete(deviceState).where(
        eq(deviceState.deviceId, SINGLE_DEVICE_ID),
      );
      console.log(`[DB] Device state cleared`);
      return { success: true };
    } catch (error) {
      console.error('[DB_ERROR] Failed to delete device state:', error);
      throw error;
    }
  }
}
