import { NotificationChannel, NotificationDelivery } from "../domain/notification-delivery.entity";
import { NotificationDeliveryRepository } from "../domain/notification-delivery.repository";

export class InMemoryNotificationDeliveryRepository implements NotificationDeliveryRepository {
  private readonly rows = new Map<string, NotificationDelivery>();

  async save(delivery: NotificationDelivery): Promise<void> {
    this.rows.set(delivery.id, delivery);
  }

  async findByNotificationAndChannel(
    notificationId: string,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    return (
      [...this.rows.values()].find((d) => d.notificationId === notificationId && d.channel === channel) ?? null
    );
  }

  all(): NotificationDelivery[] {
    return [...this.rows.values()];
  }
}
