import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { EventEmitter } from 'events';
import { PushesService } from './pushes.service';
import type { NotificationPayload } from '../../db/schema';

export const pushesRouter = new Hono();
const pushesService = new PushesService();
const ee = new EventEmitter();

ee.setMaxListeners(100);

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
        type: item.type || 'NOTIFICATION',
        isOngoing: item.isOngoing ?? false
      };

      await pushesService.savePush(payload);

    // Trigger event
      ee.emit('push', payload);
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

// SSE realtime channel
pushesRouter.get('/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const handler = async (data: NotificationPayload) => {
      await stream.writeSSE({
        data: JSON.stringify(data),
        event: 'message',
      });
    };

    ee.on('push', handler);

    console.log(`[SSE] Client connected. Total: ${ee.listenerCount('push')} clients`);

    stream.onAbort(() => {
      ee.off('push', handler);
      console.log(`[SSE] Client disconnected. Left: ${ee.listenerCount('push')} clinets`);
    });

    // Loop for Hono (Heartbeat ping)
    while (!stream.aborted) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: '', event: 'ping' });
    }
  });
});
