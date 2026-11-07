import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { EventEmitter } from 'events';
import { ClientManager } from '../honoHelpers';

export const globalEventsRouter = new Hono();
export const globalEventEmitter = new EventEmitter();
globalEventEmitter.setMaxListeners(200);
const clientManager = new ClientManager(globalEventEmitter);

// GET /api/events SSE realtime channel
globalEventsRouter.get('/', async (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = Math.random().toString(36).substring(2, 11);
    clientManager.add(clientId, c);
    console.log(
      `[Global SSE] Connected: ${clientId}. Total: ${clientManager.size}`,
    );

    const handler = async (eventData: unknown) => {
      await stream.writeSSE({
        data: JSON.stringify(eventData),
      });
    };

    globalEventEmitter.on('broadcast', handler);

    await stream.writeSSE({
      data: JSON.stringify({ type: 'WELCOME', YourId: clientId }),
    });

    stream.onAbort(() => {
      globalEventEmitter.off('broadcast', handler);
      clientManager.remove(clientId);
      console.log(
        `[Global SSE] Disconnected: ${clientId}. Left: ${clientManager.size}`,
      );
    });

    while (!stream.aborted) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: '', event: 'ping' });
    }
  });
});

// Get current connections
globalEventsRouter.get('/connections', (c) => {
  return c.json({
    total: clientManager.size,
    clients: clientManager.getAll(),
  });
});
