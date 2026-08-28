import type { NotificationWithDelivery } from "../../domain/notification.repository";
import type { NotificationDelivery } from "../../domain/notification-delivery.entity";

export class NotificationResponseDto {
  id!: string;
  type!: string;
  title!: string;
  body!: string;
  data!: unknown;
  sentAt!: string | null;
  readAt!: string | null;
  createdAt!: string;

  static fromDomain(pair: NotificationWithDelivery): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = pair.notification.id;
    dto.type = pair.notification.type;
    dto.title = pair.notification.title;
    dto.body = pair.notification.body;
    dto.data = pair.notification.data;
    dto.sentAt = pair.delivery?.sentAt?.toISOString() ?? null;
    dto.readAt = pair.delivery?.readAt?.toISOString() ?? null;
    dto.createdAt = pair.notification.createdAt.toISOString();
    return dto;
  }
}

export class NotificationDeliveryResponseDto {
  id!: string;
  channel!: string;
  status!: string;
  readAt!: string | null;

  static fromDomain(delivery: NotificationDelivery): NotificationDeliveryResponseDto {
    const dto = new NotificationDeliveryResponseDto();
    dto.id = delivery.id;
    dto.channel = delivery.channel;
    dto.status = delivery.status;
    dto.readAt = delivery.readAt?.toISOString() ?? null;
    return dto;
  }
}
