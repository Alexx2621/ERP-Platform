import { ApiProperty } from "@nestjs/swagger";
import type { NotificationWithDelivery, NotificationDelivery } from "@erp/notifications";

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: "tenancy.tenant_provisioned" }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: Object, nullable: true }) data!: unknown;
  @ApiProperty({ format: "date-time", nullable: true }) sentAt!: string | null;
  @ApiProperty({ format: "date-time", nullable: true }) readAt!: string | null;
  @ApiProperty({ format: "date-time" }) createdAt!: string;

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
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"] }) channel!: string;
  @ApiProperty({ enum: ["SENT", "FAILED"] }) status!: string;
  @ApiProperty({ format: "date-time", nullable: true }) readAt!: string | null;

  static fromDomain(delivery: NotificationDelivery): NotificationDeliveryResponseDto {
    const dto = new NotificationDeliveryResponseDto();
    dto.id = delivery.id;
    dto.channel = delivery.channel;
    dto.status = delivery.status;
    dto.readAt = delivery.readAt?.toISOString() ?? null;
    return dto;
  }
}
