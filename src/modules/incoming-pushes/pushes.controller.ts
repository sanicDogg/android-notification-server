// pushes.controller.ts

import { Hono } from 'hono';
import { PushesService } from './pushes.service';
import type { NotificationPayload } from '../../db/schema';
import { globalEventEmitter } from '../events.controller';
import { createBatchHandler } from '../common/createBatchHandler';

export const pushesRouter = new Hono();
const pushesService = new PushesService();

// HTTP Post from Android route
pushesRouter.post(
  '/',
  createBatchHandler<NotificationPayload, NotificationPayload>({
    logLabel: 'Pushes API',
    validateAndMap: (item) => {
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
      };
    },
    onProcessItem: async (payload) => {
      await pushesService.savePush(payload);
      globalEventEmitter.emit('broadcast', { type: 'NOTIF', ...payload });
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
