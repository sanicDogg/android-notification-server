
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { pushesRouter } from './modules/incoming-pushes/pushes.controller';

const app = new Hono();

// Embedded tiny logger
app.use('*', logger());
app.use('*', cors({
  origin: 'http://localhost:5173',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Connect our module to /api/pushes
app.route('/api/pushes', pushesRouter);

export default app;

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 3000 });
