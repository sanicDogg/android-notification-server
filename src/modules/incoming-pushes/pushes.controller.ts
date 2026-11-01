import { Hono } from 'hono';
import { PushesService } from './pushes.service';

export const pushesRouter = new Hono();
const pushesService = new PushesService();

// HTTP Post from Android route
pushesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    // Minimal validation
    if (!body.text || !body.packageName) {
      return c.json({ error: 'Invalid payload' }, 400);
    }

    await pushesService.savePush({
      appName: body.appName || 'Unknown',
      packageName: body.packageName,
      title: body.title || '',
      text: body.text,
      receivedAt: new Date().toISOString()
    });

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
