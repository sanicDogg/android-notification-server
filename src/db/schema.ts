import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Based on Kotlin model for Notifications
export const pushes = sqliteTable('pushes', {
  id: text('id').primaryKey(),
  packageName: text('package_name').notNull(),
  appName: text('app_name').default('Unknown'),
  title: text('title').default(''),
  text: text('text').default(''),
  subText: text('sub_text'),
  bigText: text('big_text'),
  postTime: integer('post_time').notNull(),
  timestampIso: text('timestamp_iso').notNull(),
  channelId: text('channel_id'),
  notificationKey: text('notification_key'),
  type: text('type').notNull().default('NOTIFICATION'),
  isOngoing: integer('is_ongoing', { mode: 'boolean' }).notNull().default(false),
});

// Based on Kotlin model for Device State
export const deviceState = sqliteTable('device_state', {
  deviceId: text('device_id').primaryKey(), // nothing_phone(1)
  
  batteryLevel: integer('battery_level').notNull(),
  isCharging: integer('is_charging', { mode: 'boolean' }).notNull().default(false),
  isWifiConnected: integer('is_wifi_connected', { mode: 'boolean' }).notNull(),
  wifiName: text('wifi_name'),
  isCellularConnected: integer('is_cellular_connected', { mode: 'boolean' }).notNull().default(false),
  signalStrength: text('signal_strength').notNull().default('none'),
  cellularOperator: text('cellular_operator'),
  cellularOperators: text('cellular_operators', { mode: 'json' }).$type<string[]>().notNull().default([]), 
  isAirplaneModeOn: integer('is_airplane_mode_on', { mode: 'boolean' }).notNull().default(false),
  isBluetoothOn: integer('is_bluetooth_on', { mode: 'boolean' }).notNull().default(false),
  bluetoothName: text('bluetooth_name').notNull().default(''),
  isVpnActive: integer('is_vpn_active', { mode: 'boolean' }).notNull().default(false),
  isMediaPlaying: integer('is_media_playing', { mode: 'boolean' }).notNull().default(false),
  isHeadphonesConnected: integer('is_headphones_connected', { mode: 'boolean' }).notNull().default(false),
  volumeLevel: integer('volume_level').notNull().default(0),
  volumeMax: integer('volume_max').notNull().default(0),
  volumePercent: integer('volume_percent').notNull().default(0),
  timestamp: integer('timestamp').notNull(),
  timestampIso: text('timestamp_iso').notNull(),
  trigger: text('trigger'),
  type: text('type').notNull().default('DEVICE_STATE'),
});

export const sharedFiles = sqliteTable('shared_files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  path: text('path').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const clipboardHistory = sqliteTable('clipboard_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull(),
  text: text('text').notNull(),
  capturedAt: integer('captured_at').notNull(),
});

export type ClipboardEntry = typeof clipboardHistory.$inferSelect;
export type NewClipboardEntry = typeof clipboardHistory.$inferInsert;

export type SharedFile = typeof sharedFiles.$inferSelect;
export type NewSharedFile = typeof sharedFiles.$inferInsert;

export type NotificationPayload = typeof pushes.$inferInsert;
export type DeviceStatePayload = typeof deviceState.$inferInsert;

export type IncomingDeviceState = DeviceStateSnapshot & {
  clipboardText?: string | null;
  clipboardCapturedAt?: string | number | null;
};

export type DeviceStateSnapshot = Omit<DeviceStatePayload, 'deviceId'>;
