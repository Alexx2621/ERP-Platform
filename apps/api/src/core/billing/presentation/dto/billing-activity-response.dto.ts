import { ApiProperty } from "@nestjs/swagger";
import type { BillingWebhookEvent } from "../../domain/billing-webhook-event.entity";

export class BillingActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: "subscription.create" }) eventType!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  /** Deliberately excludes the raw webhook payload — least exposure for a tenant-facing activity feed. */
  static fromDomain(event: BillingWebhookEvent): BillingActivityResponseDto {
    const dto = new BillingActivityResponseDto();
    dto.id = event.id;
    dto.eventType = event.eventType;
    dto.createdAt = event.createdAt.toISOString();
    return dto;
  }
}
