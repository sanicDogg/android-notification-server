import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { EventEmitter } from 'events';
import { DeviceStateService, SINGLE_DEVICE_ID } from './deviceState.service';
import { ClientManager } from '../../honoHelpers';
import type { DeviceStatePayload } from '../../db/schema';

export const deviceStateRouter = new Hono();
const deviceStateService = new DeviceStateService();
const ee = new EventEmitter();

ee.setMaxListeners(100);
const clientManager = new ClientManager(ee);

// POST /device-state
deviceStateRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const processItem = async (item: Partial<DeviceStatePayload>) => {
      if (item.batteryLevel === undefined) {
        throw new Error('Missing required field: batteryLevel');
      }
      if (item.isWifiConnected === undefined) {
        throw new Error('Missing required field: isWifiConnected');
      }

      const payload: Omit<DeviceStatePayload, 'deviceId'> = {
        batteryLevel: item.batteryLevel,
        isWifiConnected: item.isWifiConnected,
        wifiName: item.wifiName || null,
        isCellularConnected: item.isCellularConnected ?? false,
        signalStrength: item.signalStrength || 'NONE',
        cellularOperator: item.cellularOperator || null,
        isAirplaneModeOn: item.isAirplaneModeOn ?? false,
        isBluetoothOn: item.isBluetoothOn ?? false,
        isVpnActive: item.isVpnActive ?? false,
        isMediaPlaying: item.isMediaPlaying ?? false,
        isHeadphonesConnected: item.isHeadphonesConnected ?? false,
        volumeLevel: item.volumeLevel ?? 0,
        volumeMax: item.volumeMax ?? 0,
        volumePercent: item.volumePercent ?? 0,
        clipboardText: item.clipboardText || null,
        clipboardCapturedAt: item.clipboardCapturedAt || null,
        timestamp: item.timestamp || Date.now(),
        timestampIso: item.timestampIso || new Date().toISOString(),
        trigger: item.trigger || null,
        type: item.type || 'DEVICE_STATE',
      };

      await deviceStateService.saveDeviceState(payload);

      ee.emit('device_update', {
        ...payload,
        deviceId: SINGLE_DEVICE_ID,
      });
    };

    if (Array.isArray(body)) {
      console.log(
        `[DeviceState API] Processing a batch of ${body.length} states`,
      );
      for (const item of body) {
        await processItem(item);
      }
    } else {
      console.log(`[DeviceState API] State received from the device`);
      await processItem(body);
    }

    return c.json({ success: true, status: 'Processed successfully' }, 201);
  } catch (error) {
    console.error('[DeviceState API ERROR]', (error as Error).message);
    return c.json({
      error: 'Bad Request',
      details: (error as Error).message,
    }, 400);
  }
});

// GET /device-state
deviceStateRouter.get('/', async (c) => {
  const state = await deviceStateService.getSingleDeviceState();
  return c.json(state || { message: 'No state recorded yet' });
});

deviceStateRouter.get('/connections', (c) => {
  return c.json({
    total: clientManager.size,
    clients: clientManager.getAll(),
  });
});

// DELETE /device-state
deviceStateRouter.delete('/', async (c) => {
  try {
    await deviceStateService.deleteDeviceState();
    ee.emit('device_update', {
      type: 'DELETED',
      deviceId: SINGLE_DEVICE_ID,
    });
    return c.json({ success: true, message: 'Device state cleared' });
  } catch (error) {
    return c.json({
      error: 'Internal Server Error',
      details: (error as Error).message,
    }, 500);
  }
});

// GET /device-state/events
deviceStateRouter.get('/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = Math.random().toString(36).substring(2, 11);
    clientManager.add(clientId, c);
    console.log(
      `[DeviceState SSE] Connected: ${clientId}. Total: ${clientManager.size}`,
    );

    const handler = async (eventData: any) => {
      await stream.writeSSE({
        data: JSON.stringify(eventData),
        event: 'message',
      });
    };

    ee.on('device_update', handler);

    await stream.writeSSE({
      data: JSON.stringify({ type: 'WELCOME', YourId: clientId }),
      event: 'message',
    });

    stream.onAbort(() => {
      ee.off('device_update', handler);
      clientManager.remove(clientId);
      console.log(`[DeviceState SSE] Disconnected: ${clientId}`);
    });

    while (!stream.aborted) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: '', event: 'ping' });
    }
  });
});
