import type { NotificationChannel, NotificationDelivery } from "./notification-delivery.entity";

export const NOTIFICATION_DELIVERY_REPOSITORY = Symbol("NOTIFICATION_DELIVERY_REPOSITORY");

export interface NotificationDeliveryRepository {
  save(delivery: NotificationDelivery): Promise<void>;
  findByNotificationAndChannel(
    notificationId: string,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null>;
}
