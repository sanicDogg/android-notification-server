// shared/createBatchHandler.ts
import type { Context } from 'hono';

interface BatchHandlerConfig<TInput, TPayload> {
  logLabel: string;
  validateAndMap: (item: Partial<TInput>) => TPayload | Promise<TPayload>;
  onProcessItem: (payload: TPayload) => Promise<void>;
}

export function createBatchHandler<TInput, TPayload>(
  config: BatchHandlerConfig<TInput, TPayload>,
) {
  return async (c: Context) => {
    try {
      const body = await c.req.json();

      const processItem = async (item: Partial<TInput>) => {
        const payload = await config.validateAndMap(item);
        await config.onProcessItem(payload);
      };

      if (Array.isArray(body)) {
        console.log(
          `[${config.logLabel}] Processing a batch of ${body.length} items`,
        );
        for (const item of body) {
          await processItem(item);
        }
      } else {
        console.log(`[${config.logLabel}] Single item received`);
        await processItem(body);
      }

      return c.json({ success: true, status: 'Processed successfully' }, 201);
    } catch (error) {
      console.error(`[${config.logLabel} ERROR]`, (error as Error).message);
      return c.json({
        error: 'Bad Request',
        details: (error as Error).message,
      }, 400);
    }
  };
}
