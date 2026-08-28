import type { Notification } from "./notification.entity";
import type { NotificationDelivery } from "./notification-delivery.entity";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

export interface FindNotificationsQuery {
  tenantId: string;
  recipientUserId: string;
  unreadOnly: boolean;
  limit: number;
}

/** A read-side pairing used only for the recipient's list view — the IN_APP delivery is `null` if none was ever created for that notification. */
export interface NotificationWithDelivery {
  notification: Notification;
  delivery: NotificationDelivery | null;
}

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByRecipientWithDelivery(query: FindNotificationsQuery): Promise<NotificationWithDelivery[]>;
}
