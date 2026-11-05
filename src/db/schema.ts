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
  isWifiConnected: integer('is_wifi_connected', { mode: 'boolean' }).notNull(),
  wifiName: text('wifi_name'),
  isCellularConnected: integer('is_cellular_connected', { mode: 'boolean' }).notNull().default(false),
  signalStrength: text('signal_strength').notNull().default('NONE'),
  cellularOperator: text('cellular_operator'),
  isAirplaneModeOn: integer('is_airplane_mode_on', { mode: 'boolean' }).notNull().default(false),
  isBluetoothOn: integer('is_bluetooth_on', { mode: 'boolean' }).notNull().default(false),
  isVpnActive: integer('is_vpn_active', { mode: 'boolean' }).notNull().default(false),
  isMediaPlaying: integer('is_media_playing', { mode: 'boolean' }).notNull().default(false),
  isHeadphonesConnected: integer('is_headphones_connected', { mode: 'boolean' }).notNull().default(false),
  volumeLevel: integer('volume_level').notNull().default(0),
  volumeMax: integer('volume_max').notNull().default(0),
  volumePercent: integer('volume_percent').notNull().default(0),
  clipboardText: text('clipboard_text'),
  clipboardCapturedAt: integer('clipboard_captured_at'),
  timestamp: integer('timestamp').notNull(),
  timestampIso: text('timestamp_iso').notNull(),
  trigger: text('trigger'),
  type: text('type').notNull().default('DEVICE_STATE'),
});

export type NotificationPayload = typeof pushes.$inferInsert;
export type DeviceStatePayload = typeof deviceState.$inferInsert;
