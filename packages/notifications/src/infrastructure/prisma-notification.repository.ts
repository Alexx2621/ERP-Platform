import { Inject, Injectable } from "@nestjs/common";
import type {
  Notification as PrismaNotification,
  NotificationDelivery as PrismaNotificationDelivery,
  Prisma,
  PrismaClient,
} from "@erp/database";
import { Notification } from "../domain/notification.entity";
import { NotificationDelivery } from "../domain/notification-delivery.entity";
import {
  FindNotificationsQuery,
  NotificationRepository,
  NotificationWithDelivery,
} from "../domain/notification.repository";
import { PRISMA_CLIENT } from "./prisma-client.token";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async save(notification: Notification): Promise<void> {
    const props = notification.toProps();
    await this.prisma.notification.create({
      data: {
        id: props.id,
        tenantId: props.tenantId,
        recipientUserId: props.recipientUserId,
        type: props.type,
        title: props.title,
        body: props.body,
        data: props.data as Prisma.InputJsonValue | undefined,
        createdAt: props.createdAt,
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  /**
   * "Unread" only has meaning for IN_APP (reading is a UI concept) — a row
   * qualifies when its IN_APP delivery exists, was actually SENT, and has
   * no `readAt` yet.
   */
  async findByRecipientWithDelivery(query: FindNotificationsQuery): Promise<NotificationWithDelivery[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        tenantId: query.tenantId,
        recipientUserId: query.recipientUserId,
        ...(query.unreadOnly
          ? { deliveries: { some: { channel: "IN_APP", status: "SENT", readAt: null } } }
          : {}),
      },
      include: { deliveries: { where: { channel: "IN_APP" } } },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    return records.map((record) => ({
      notification: this.toDomain(record),
      delivery: record.deliveries[0] ? this.deliveryToDomain(record.deliveries[0]) : null,
    }));
  }

  private toDomain(record: PrismaNotification): Notification {
    return Notification.create({
      id: record.id,
      tenantId: record.tenantId,
      recipientUserId: record.recipientUserId,
      type: record.type,
      title: record.title,
      body: record.body,
      data: record.data,
      createdAt: record.createdAt,
    });
  }

  private deliveryToDomain(record: PrismaNotificationDelivery): NotificationDelivery {
    return NotificationDelivery.create({
      id: record.id,
      notificationId: record.notificationId,
      channel: record.channel,
      status: record.status,
      sentAt: record.sentAt,
      readAt: record.readAt,
      failureReason: record.failureReason,
      createdAt: record.createdAt,
    });
  }
}
