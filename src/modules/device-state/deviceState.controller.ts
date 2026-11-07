// deviceState.controller.ts

import { Hono } from 'hono';
import { DeviceStateService, SINGLE_DEVICE_ID } from './deviceState.service';
import type { DeviceStatePayload } from '../../db/schema';
import { globalEventEmitter } from '../events.controller';

export const deviceStateRouter = new Hono();
const deviceStateService = new DeviceStateService();

// POST /device-state
deviceStateRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const processItem = async (item: Partial<DeviceStatePayload>) => {
      if (item.batteryLevel === undefined) {
        throw new Error('Missing required field: batteryLevel');
      }
      if (item.isWifiConnected === undefined) {
        throw new Error('Missing required field: isWifiConnected');
      }

      const payload: Omit<DeviceStatePayload, 'deviceId'> = {
        batteryLevel: item.batteryLevel,
        isWifiConnected: item.isWifiConnected,
        wifiName: item.wifiName || null,
        isCellularConnected: item.isCellularConnected ?? false,
        signalStrength: item.signalStrength || 'NONE',
        cellularOperator: item.cellularOperator || null,
        isAirplaneModeOn: item.isAirplaneModeOn ?? false,
        isBluetoothOn: item.isBluetoothOn ?? false,
        isVpnActive: item.isVpnActive ?? false,
        isMediaPlaying: item.isMediaPlaying ?? false,
        isHeadphonesConnected: item.isHeadphonesConnected ?? false,
        volumeLevel: item.volumeLevel ?? 0,
        volumeMax: item.volumeMax ?? 0,
        volumePercent: item.volumePercent ?? 0,
        clipboardText: item.clipboardText || null,
        clipboardCapturedAt: item.clipboardCapturedAt || null,
        timestamp: item.timestamp || Date.now(),
        timestampIso: item.timestampIso || new Date().toISOString(),
        trigger: item.trigger || null,
      };

      await deviceStateService.saveDeviceState(payload);

      globalEventEmitter.emit('broadcast', {
        type: 'DEVICE_STATE',
        ...payload,
        deviceId: SINGLE_DEVICE_ID,
      });
    };

    if (Array.isArray(body)) {
      console.log(
        `[DeviceState API] Processing a batch of ${body.length} states`,
      );
      for (const item of body) {
        await processItem(item);
      }
    } else {
      console.log(`[DeviceState API] State received from the device`);
      await processItem(body);
    }

    return c.json({ success: true, status: 'Processed successfully' }, 201);
  } catch (error) {
    console.error('[DeviceState API ERROR]', (error as Error).message);
    return c.json({
      error: 'Bad Request',
      details: (error as Error).message,
    }, 400);
  }
});

// GET /device-state
deviceStateRouter.get('/', async (c) => {
  const state = await deviceStateService.getSingleDeviceState();
  return c.json(state || { message: 'No state recorded yet' });
});

// DELETE /device-state
deviceStateRouter.delete('/', async (c) => {
  try {
    await deviceStateService.deleteDeviceState();
    globalEventEmitter.emit('DEVICE_STATE', {
      type: 'DELETED',
      deviceId: SINGLE_DEVICE_ID,
    });
    return c.json({ success: true, message: 'Device state cleared' });
  } catch (error) {
    return c.json({
      error: 'Internal Server Error',
      details: (error as Error).message,
    }, 500);
  }
});
