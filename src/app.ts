
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { pushesRouter } from './modules/incoming-pushes/pushes.controller';

const app = new Hono();

// Embedded tiny logger
app.use('*', logger());

// Connect our module to /api/pushes
app.route('/api/pushes', pushesRouter);

export default app;

serve({ fetch: app.fetch, port: 3000 });
