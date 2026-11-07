import { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { EventEmitter } from 'events';

export function getClientIp(c: Context): string {
  const conn = getConnInfo(c);
  const rawIp = c.req.header('x-forwarded-for') || 
                c.req.header('cf-connecting-ip') || 
                conn.remote.address || 
                '127.0.0.1';
                
  return rawIp.split(',')[0]?.trim() ?? 'unknown';
}

interface ClientInfo {
  id: string;
  ip: string;
  userAgent: string;
  connectedAt: string;
}

export class ClientManager {
  private activeClients = new Map<string, ClientInfo>();
  private ee: EventEmitter;

  constructor(ee: EventEmitter) {
    this.ee = ee;
  }

  public get size(): number {
    return this.activeClients.size;
  }

  public getAll(): ClientInfo[] {
    return Array.from(this.activeClients.values());
  }

  public add(clientId: string, c: Context): ClientInfo {
    const clientData: ClientInfo = {
      id: clientId,
      ip: getClientIp(c),
      userAgent: c.req.header('user-agent') || 'Unknown',
      connectedAt: new Date().toISOString()
    };
    
    this.activeClients.set(clientId, clientData);
    this.ee.emit('broadcast', { type: 'CLIENT_CONNECTED', client: clientData });
    
    return clientData;
  }

  public remove(clientId: string): void {
    if (this.activeClients.has(clientId)) {
      this.activeClients.delete(clientId);
      this.ee.emit('broadcast', { type: 'CLIENT_DISCONNECTED', clientId });
    }
  }
}