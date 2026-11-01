import type { NotificationPayload } from '../../db/schema';
// Import prefered db instance

export class PushesService {
  async savePush(payload: NotificationPayload) {
    // Insert to SQLite logic. With better-sqlite3:
    // const stmt = db.prepare('INSERT INTO pushes (appName, packageName, title, text, receivedAt) VALUES (?, ?, ?, ?, ?)');
    // stmt.run(payload.appName, payload.packageName, payload.title, payload.text, new Date().toISOString());
    
    console.log(`[DB] Saved push from ${payload.appName}`);
    return { success: true };
  }

  async getAllPushes() {
    // return db.prepare('SELECT * FROM pushes ORDER BY id DESC').all();

    // stub
    return [
        { id: 1, appName: 'Telegram', title: 'Дмитрий', text: 'Привет! Как сервер?', receivedAt: '12:00' }
    ];
  }
}
