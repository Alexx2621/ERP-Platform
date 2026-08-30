import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Notification } from "../../domain/notification.entity";
import { NOTIFICATION_REPOSITORY, NotificationRepository } from "../../domain/notification.repository";
import {
  IMPLEMENTED_NOTIFICATION_CHANNELS,
  NotificationChannel,
  NotificationDelivery,
} from "../../domain/notification-delivery.entity";
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from "../../domain/notification-delivery.repository";

export interface RequestNotificationInput {
  tenantId: string | null;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  channels: NotificationChannel[];
}

export interface RequestNotificationResult {
  notification: Notification;
  deliveries: NotificationDelivery[];
}

/**
 * The "any module can request a notification without knowing the delivery
 * provider" entry point (MASTER_SPEC §48). Not reachable over HTTP — a
 * public endpoint that lets any authenticated caller notify an arbitrary
 * user would be an abuse surface, so this is only an internal service call
 * from another module (same pattern as RecordAuditEntryUseCase). Dispatch
 * is synchronous: IN_APP "sending" is just persisting the row, so every
 * delivery is created already SENT or FAILED, never PENDING.
 */
@Injectable()
export class RequestNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepository,
  ) {}

  async execute(input: RequestNotificationInput): Promise<RequestNotificationResult> {
    const now = new Date();
    const notification = Notification.create({
      id: newId(),
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      createdAt: now,
    });
    await this.notifications.save(notification);

    const createdDeliveries: NotificationDelivery[] = [];
    for (const channel of input.channels) {
      const implemented = IMPLEMENTED_NOTIFICATION_CHANNELS.includes(channel);
      const delivery = NotificationDelivery.create({
        id: newId(),
        notificationId: notification.id,
        channel,
        status: implemented ? "SENT" : "FAILED",
        sentAt: implemented ? now : null,
        readAt: null,
        failureReason: implemented ? null : `Channel ${channel} has no adapter implemented yet.`,
        createdAt: now,
      });
      await this.deliveries.save(delivery);
      createdDeliveries.push(delivery);
    }

    return { notification, deliveries: createdDeliveries };
  }
}
