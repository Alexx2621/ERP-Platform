import { Inject, Injectable } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY, NotificationRepository } from "../../domain/notification.repository";
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from "../../domain/notification-delivery.repository";
import { NotificationDelivery } from "../../domain/notification-delivery.entity";
import { NotificationNotFoundError } from "../errors";

export interface MarkNotificationReadInput {
  notificationId: string;
  tenantId: string;
  recipientUserId: string;
}

/**
 * Marks the notification's IN_APP delivery as read. Verifies both tenant
 * and recipient ownership before touching anything — same IDOR-resistant
 * shape as GetFileDownloadUrlUseCase: "doesn't exist" and "isn't yours"
 * both surface as the identical NotificationNotFoundError.
 */
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepository,
  ) {}

  async execute(input: MarkNotificationReadInput): Promise<NotificationDelivery | null> {
    const notification = await this.notifications.findById(input.notificationId);
    if (
      !notification ||
      notification.tenantId !== input.tenantId ||
      notification.recipientUserId !== input.recipientUserId
    ) {
      throw new NotificationNotFoundError();
    }

    const delivery = await this.deliveries.findByNotificationAndChannel(notification.id, "IN_APP");
    if (!delivery) return null;

    delivery.markRead(new Date());
    await this.deliveries.save(delivery);
    return delivery;
  }
}
