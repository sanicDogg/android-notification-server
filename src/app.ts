import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { pushesRouter } from './modules/incoming-pushes/pushes.controller';
import { deviceStateRouter } from './modules/device-state/deviceState.controller';
import { globalEventsRouter } from './modules/events.controller';
import { filesRouter } from './modules/files/files.controller';

import { getLaunchedMode } from './utils';

const app = new Hono();

// Embedded tiny logger
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

// Connect our modules
app.route('/api/pushes', pushesRouter);
app.route('/api/device-state', deviceStateRouter);
app.route('/api/events', globalEventsRouter);
app.route('/api/shared', filesRouter);

export default app;

const options = { hostname: '127.0.0.1', port: 3000 };
serve({ fetch: app.fetch, ...options });
console.log(
  '\n*** Running in %s mode with options: %o ***\n',
  getLaunchedMode(),
  options,
);
