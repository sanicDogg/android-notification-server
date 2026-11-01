import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { EventEmitter } from 'events';
import { PushesService } from './pushes.service';

export const pushesRouter = new Hono();
const pushesService = new PushesService();
const ee = new EventEmitter();

ee.setMaxListeners(100);

// HTTP Post from Android route
pushesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    // Minimal validation
    if (!body.text || !body.packageName) {
      return c.json({ error: 'Invalid payload' }, 400);
    }

    const payload = {
      appName: body.appName || 'Unknown',
      packageName: body.packageName,
      title: body.title || '',
      text: body.text,
      receivedAt: new Date().toISOString()
    }

    await pushesService.savePush(payload);

    // Trigger event
    ee.emit('push', payload);

    return c.json({ success: true, status: 'Saved' }, 201);
  } catch (error) {
    return c.json({ error: 'Server Error', details: (error as Error).message }, 500);
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
    const handler = async (data: any) => {
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

    // Loop for Hono 
    while (!stream.aborted) {
      await stream.sleep(30000);
    }
  });
});
