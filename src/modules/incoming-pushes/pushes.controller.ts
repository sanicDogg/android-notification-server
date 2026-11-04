import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { EventEmitter } from 'events';
import { PushesService } from './pushes.service';
import { ClientManager } from '../../honoHelpers';
import type { NotificationPayload } from '../../db/schema';

export const pushesRouter = new Hono();
const pushesService = new PushesService();
const ee = new EventEmitter();

ee.setMaxListeners(100);
const clientManager = new ClientManager(ee);

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

// Get current connections
pushesRouter.get('/connections', (c) => {
  return c.json({
    total: clientManager.size,
    clients: clientManager.getAll()
  });
});

pushesRouter.delete('/', async (c) => {
  try {
    await pushesService.deleteAllPushes();
    ee.emit('push', { type: 'CLEAR_ALL' });
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
    ee.emit('push', { type: 'DELETED', id });
    return c.json({ success: true, message: `Notification ${id} deleted` });
  } catch (error) {
    return c.json({ error: 'Internal Server Error', details: (error as Error).message }, 500);
  }
});

// SSE realtime channel
pushesRouter.get('/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = Math.random().toString(36).substring(2, 11);
    clientManager.add(clientId, c);
    console.log(`[SSE] Client connected: ${clientId}. Total: ${clientManager.size}`);

    const handler = async (eventData: any) => {
      await stream.writeSSE({
        data: JSON.stringify(eventData),
        event: 'message',
      });
    };

    ee.on('push', handler);

    await stream.writeSSE({
      data: JSON.stringify({ type: 'WELCOME', YourId: clientId }),
      event: 'message'
    });

    stream.onAbort(() => {
      ee.off('push', handler);
      clientManager.remove(clientId);
      console.log(`[SSE] Client disconnected: ${clientId}. Left: ${clientManager.size}`);
    });

    while (!stream.aborted) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: '', event: 'ping' });
    }
  });
});
