// pushes.controller.ts

import { Hono } from 'hono';
import { PushesService } from './pushes.service';
import type { NotificationPayload } from '../../db/schema';
import { globalEventEmitter } from '../events.controller';

export const pushesRouter = new Hono();
const pushesService = new PushesService();

// HTTP Post from Android route
pushesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validation
    const processItem = async (item: Partial<NotificationPayload>) => {
      if (!item.id || !item.packageName) {
        throw new Error('Missing required fields: id or packageName');
      }

      const payload: NotificationPayload = {
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
        isOngoing: item.isOngoing ?? false
      };

      await pushesService.savePush(payload);

      // Trigger event
      globalEventEmitter.emit('broadcast', {
        type: 'NOTIF',
        ...payload,
      });
    };

    if (Array.isArray(body)) {
      console.log(`[API] Processing a batch of ${body.length} notifications`);

      for (const item of body) {
        await processItem(item);
      }
    } else {
      console.log(`[API] Processing single notification from: ${body.packageName}`);
      await processItem(body);
    }

    return c.json({ success: true, status: 'Processed successfully' }, 201);
  } catch (error) {
    console.error('[API_ERROR]', (error as Error).message);
    return c.json({ error: 'Bad Request', details: (error as Error).message }, 400);
  }
});

// Get logs route
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
    return c.json({ error: 'Internal Server Error', details: (error as Error).message }, 500);
  }
});

// DELETE /api/pushes/:id
pushesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await pushesService.deletePushById(id);
    globalEventEmitter.emit('broadcast', { type: 'NOTIF_DELETED', id });
    return c.json({ success: true, message: `Notification ${id} deleted` });
  } catch (error) {
    return c.json({ error: 'Internal Server Error', details: (error as Error).message }, 500);
  }
});
