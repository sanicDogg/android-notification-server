// pushes.controller.ts

import { Hono } from 'hono';
import { PushesService } from './pushes.service';
import { globalEventEmitter } from '../events.controller';
import { createBatchHandler } from '../common/createBatchHandler';
import { mapAndValidateDeviceState, SINGLE_DEVICE_ID } from '../common/deviceState.shared';
import { DeviceStateService } from '../device-state/deviceState.service.ts';
import type { NotificationPayload } from '../../db/schema';
import type { UnvalidatedDeviceState } from '../common/deviceState.shared';

interface IncomingPushItem extends Partial<NotificationPayload> {
  id: string;
  packageName: string;
  deviceState?: UnvalidatedDeviceState | null;
}
interface ProcessedPushItem extends NotificationPayload {
  deviceState: ReturnType<typeof mapAndValidateDeviceState> | null;
}

export const pushesRouter = new Hono();
const pushesService = new PushesService();

const deviceStateService = new DeviceStateService();

// HTTP Post from Android route
pushesRouter.post(
  '/',
  createBatchHandler<IncomingPushItem, ProcessedPushItem>({
    logLabel: 'Pushes API',
    validateAndMap: (item): ProcessedPushItem => {
      console.log('pushesRouter_validateAndMap');
      console.log(item);
      console.log('-pushesRouter_validateAndMap-');

      if (!item.id || !item.packageName) {
        throw new Error('Missing required fields: id or packageName');
      }
      return {
        id: item.id,
        packageName: item.packageName,
        appName: item.appName || 'Unknown',
        title: item.title || '',
        text: item.text || item.bigText || item.subText || '',
        subText: item.subText || null,
        bigText: item.bigText || null,
        postTime: item.postTime || Date.now(),
        timestampIso: item.timestampIso || new Date().toISOString(),
        channelId: item.channelId || null,
        notificationKey: item.notificationKey || null,
        isOngoing: item.isOngoing ?? false,

        // we adding device-state here to reduce battery impact 
        // (both notif and state comes in one HTTP request)
        deviceState: item.deviceState 
          ? {
            ...mapAndValidateDeviceState(item.deviceState),
            trigger: item.deviceState.trigger || 'NOTIFICATION',
          }
          : null,
      };
    },
    onProcessItem: async (payload) => {
      const { deviceState, ...pushData } = payload;

      await pushesService.savePush(pushData);
      globalEventEmitter.emit('broadcast', { type: 'NOTIF', ...pushData });

      if (deviceState) {
        await deviceStateService.saveDeviceState(deviceState);
        globalEventEmitter.emit('broadcast', {
          type: 'DEVICE_STATE',
          ...deviceState,
          deviceId: SINGLE_DEVICE_ID,
        });
      }
    },
  }),
);

pushesRouter.get('/', async (c) => {
  const list = await pushesService.getAllPushes();
  return c.json(list);
});

pushesRouter.delete('/', async (c) => {
  try {
    await pushesService.deleteAllPushes();
    globalEventEmitter.emit('broadcast', { type: 'NOTIF_CLEAR_ALL' });
    return c.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    return c.json({
      error: 'Internal Server Error',
      details: (error as Error).message,
    }, 500);
  }
});

pushesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await pushesService.deletePushById(id);
    globalEventEmitter.emit('broadcast', { type: 'NOTIF_DELETED', id });
    return c.json({ success: true, message: `Notification ${id} deleted` });
  } catch (error) {
    return c.json({
      error: 'Internal Server Error',
      details: (error as Error).message,
    }, 500);
  }
});
