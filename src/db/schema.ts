import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Based on Kotlin model
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

export type NotificationPayload = typeof pushes.$inferInsert;
