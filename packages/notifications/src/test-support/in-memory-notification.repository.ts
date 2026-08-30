import { Notification } from "../domain/notification.entity";
import { NotificationDelivery } from "../domain/notification-delivery.entity";
import {
  FindNotificationsQuery,
  NotificationRepository,
  NotificationWithDelivery,
} from "../domain/notification.repository";

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly rows = new Map<string, Notification>();

  constructor(private readonly deliveries: { all(): NotificationDelivery[] } = { all: () => [] }) {}

  async save(notification: Notification): Promise<void> {
    this.rows.set(notification.id, notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.rows.get(id) ?? null;
  }

  async findByRecipientWithDelivery(query: FindNotificationsQuery): Promise<NotificationWithDelivery[]> {
    const allDeliveries = this.deliveries.all();
    return [...this.rows.values()]
      .filter(
        (notification) =>
          notification.tenantId === query.tenantId && notification.recipientUserId === query.recipientUserId,
      )
      .map((notification) => ({
        notification,
        delivery: allDeliveries.find((d) => d.notificationId === notification.id && d.channel === "IN_APP") ?? null,
      }))
      .filter((pair) => !query.unreadOnly || (pair.delivery?.status === "SENT" && !pair.delivery.readAt))
      .sort((a, b) => b.notification.createdAt.getTime() - a.notification.createdAt.getTime())
      .slice(0, query.limit);
  }

  seed(notification: Notification): void {
    this.rows.set(notification.id, notification);
  }
}
