// deviceState.controller.ts

import { Hono } from 'hono';
import { DeviceStateService, SINGLE_DEVICE_ID } from './deviceState.service';
import type { DeviceStatePayload } from '../../db/schema';
import { globalEventEmitter } from '../events.controller';
import { createBatchHandler } from '../shared/createBatchHandler';

export const deviceStateRouter = new Hono();
const deviceStateService = new DeviceStateService();

// POST /device-state
deviceStateRouter.post(
  '/',
  createBatchHandler<DeviceStatePayload, Omit<DeviceStatePayload, 'deviceId'>>({
    logLabel: 'DeviceState API',
    validateAndMap: (item) => {
      if (
        item.batteryLevel === undefined || item.isWifiConnected === undefined
      ) {
        throw new Error(
          'Missing required fields: batteryLevel or isWifiConnected',
        );
      }
      return {
        batteryLevel: item.batteryLevel,
        isCharging: item.isCharging ?? false,
        isWifiConnected: item.isWifiConnected,
        wifiName: item.wifiName || null,
        isCellularConnected: item.isCellularConnected ?? false,
        signalStrength: item.signalStrength || 'NONE',
        cellularOperator: item.cellularOperator || null,
        cellularOperators: item.cellularOperators || [],
        isAirplaneModeOn: item.isAirplaneModeOn ?? false,
        isBluetoothOn: item.isBluetoothOn ?? false,
        bluetoothName: item.bluetoothName || '',
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
        type: item.type || 'DEVICE_STATE',
      };
    },
    onProcessItem: async (payload) => {
      await deviceStateService.saveDeviceState(payload);
      globalEventEmitter.emit('broadcast', {
        type: 'DEVICE_STATE',
        ...payload,
        deviceId: SINGLE_DEVICE_ID,
      });
    },
  }),
);

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
