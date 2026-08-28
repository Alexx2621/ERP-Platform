import { Injectable } from "@nestjs/common";
import type { NotificationDelivery as PrismaNotificationDelivery } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { NotificationChannel, NotificationDelivery } from "../domain/notification-delivery.entity";
import { NotificationDeliveryRepository } from "../domain/notification-delivery.repository";

@Injectable()
export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(delivery: NotificationDelivery): Promise<void> {
    const props = delivery.toProps();
    await this.prisma.notificationDelivery.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        notificationId: props.notificationId,
        channel: props.channel,
        status: props.status,
        sentAt: props.sentAt,
        readAt: props.readAt,
        failureReason: props.failureReason,
        createdAt: props.createdAt,
      },
      update: {
        status: props.status,
        sentAt: props.sentAt,
        readAt: props.readAt,
        failureReason: props.failureReason,
      },
    });
  }

  async findByNotificationAndChannel(
    notificationId: string,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const record = await this.prisma.notificationDelivery.findUnique({
      where: { notificationId_channel: { notificationId, channel } },
    });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: PrismaNotificationDelivery): NotificationDelivery {
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
