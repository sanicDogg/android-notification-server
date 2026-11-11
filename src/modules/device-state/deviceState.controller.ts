// deviceState.controller.ts

import { Hono } from 'hono';
import { DeviceStateService } from './deviceState.service';
import { globalEventEmitter } from '../events.controller';
import { createBatchHandler } from '../common/createBatchHandler';
import {
  mapAndValidateDeviceState,
  SINGLE_DEVICE_ID,
} from '../common/deviceState.shared.ts';
import type { DeviceStatePayload, DeviceStateSnapshot } from '../../db/schema';

export const deviceStateRouter = new Hono();
const deviceStateService = new DeviceStateService();

// POST /device-state
deviceStateRouter.post(
  '/',
  createBatchHandler<DeviceStatePayload, DeviceStateSnapshot>({
    logLabel: 'DeviceState API',
    validateAndMap: (item) => {
      return mapAndValidateDeviceState(item);
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
