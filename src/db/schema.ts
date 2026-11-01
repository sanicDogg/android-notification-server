// Based on Kotlin model;
export interface NotificationPayload {
  id: string;
  packageName: string;
  appName?: string | null;
  title?: string | null;
  text?: string | null;
  subText?: string | null;
  bigText?: string | null;
  postTime: number;
  timestampIso: string;
  channelId?: string | null;
  notificationKey?: string | null;
  type: string;
  isOngoing: boolean;
}
