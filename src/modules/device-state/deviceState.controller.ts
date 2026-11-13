// deviceState.controller.ts

import { Hono } from 'hono';
import { DeviceStateService } from './deviceState.service';
import { globalEventEmitter } from '../events.controller';
import { createBatchHandler } from '../common/createBatchHandler';
import {
  mapAndValidateDeviceState,
  SINGLE_DEVICE_ID,
} from '../common/deviceState.shared';
import type { IncomingDeviceState } from '../../db/schema';

export const deviceStateRouter = new Hono();
const deviceStateService = new DeviceStateService();

// POST /device-state
deviceStateRouter.post(
  '/',
  createBatchHandler<IncomingDeviceState, IncomingDeviceState>({
    logLabel: 'DeviceState API',
    validateAndMap: (item) => mapAndValidateDeviceState(item),
    onProcessItem: async (payload) => {
      const { cleanState, newClipboardEntry } =
        await deviceStateService.saveDeviceState(payload);

      globalEventEmitter.emit('broadcast', {
        type: 'DEVICE_STATE',
        ...cleanState,
        deviceId: SINGLE_DEVICE_ID,
      });

      if (newClipboardEntry) {
        globalEventEmitter.emit('broadcast', {
          type: 'CLIPBOARD_UPDATED',
          data: newClipboardEntry,
        });
      }
    },
  }),
);

// GET /device-state
deviceStateRouter.get('/', async (c) => {
  const state = await deviceStateService.getSingleDeviceState();
  return c.json(state || { message: 'No state recorded yet' });
});

// GET /device-state/clipboard
deviceStateRouter.get('/clipboard', async (c) => {
  const limit = Number(c.req.query('limit')) || 50;
  const history = await deviceStateService.getClipboardHistory(limit);
  return c.json(history);
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
