import { db } from '../../db';
import { deviceState } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { SINGLE_DEVICE_ID } from '../common/deviceState.shared.ts';
import type { DeviceStateSnapshot } from '../../db/schema';

export class DeviceStateService {
  async saveDeviceState(payload: DeviceStateSnapshot) {
    try {
      const dataToSave = {
        ...payload,
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

      console.log(`[DB] Updated state for the single device`);
      return { success: true };
    } catch (error) {
      console.error('[DB_ERROR] Failed to save device state:', error);
      throw error;
    }
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
