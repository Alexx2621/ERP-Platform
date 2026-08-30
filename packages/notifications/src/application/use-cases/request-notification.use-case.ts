import { Inject, Injectable, Optional } from "@nestjs/common";
import { newId } from "@erp/database";
import { Notification } from "../../domain/notification.entity";
import { NOTIFICATION_REPOSITORY, NotificationRepository } from "../../domain/notification.repository";
import { NotificationChannel, NotificationDelivery } from "../../domain/notification-delivery.entity";
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from "../../domain/notification-delivery.repository";
import { EMAIL_DISPATCHER, EmailDispatcherPort } from "../ports/email-dispatcher.port";

export interface RequestNotificationInput {
  tenantId: string | null;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  channels: NotificationChannel[];
  /** Required for the EMAIL channel to actually dispatch — the caller already has the User in scope, so this package never needs to look it up itself. */
  recipientEmail?: string;
}

export interface RequestNotificationResult {
  notification: Notification;
  deliveries: NotificationDelivery[];
}

interface ChannelDispatchOutcome {
  ok: boolean;
  reason?: string;
}

/**
 * The "any module can request a notification without knowing the delivery
 * provider" entry point (MASTER_SPEC §48). Not reachable over HTTP — a
 * public endpoint that lets any authenticated caller notify an arbitrary
 * user would be an abuse surface, so this is only an internal service call
 * from another module (same pattern as RecordAuditEntryUseCase). Dispatch
 * is synchronous, so every delivery is created already SENT or FAILED,
 * never PENDING.
 */
@Injectable()
export class RequestNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepository,
    @Optional() @Inject(EMAIL_DISPATCHER) private readonly emailDispatcher?: EmailDispatcherPort,
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
      const outcome = await this.dispatch(channel, input);
      const delivery = NotificationDelivery.create({
        id: newId(),
        notificationId: notification.id,
        channel,
        status: outcome.ok ? "SENT" : "FAILED",
        sentAt: outcome.ok ? now : null,
        readAt: null,
        failureReason: outcome.ok ? null : (outcome.reason ?? "Delivery failed."),
        createdAt: now,
      });
      await this.deliveries.save(delivery);
      createdDeliveries.push(delivery);
    }

    return { notification, deliveries: createdDeliveries };
  }

  private async dispatch(channel: NotificationChannel, input: RequestNotificationInput): Promise<ChannelDispatchOutcome> {
    if (channel === "IN_APP") {
      // Persisting the NotificationDelivery row IS the delivery for this channel.
      return { ok: true };
    }

    if (channel === "EMAIL") {
      if (!this.emailDispatcher) {
        return { ok: false, reason: "No email adapter configured." };
      }
      if (!input.recipientEmail) {
        return { ok: false, reason: "No recipient email address was provided." };
      }
      try {
        await this.emailDispatcher.send({ to: input.recipientEmail, subject: input.title, body: input.body });
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "Email dispatch failed." };
      }
    }

    return { ok: false, reason: `Channel ${channel} has no adapter implemented yet.` };
  }
}
