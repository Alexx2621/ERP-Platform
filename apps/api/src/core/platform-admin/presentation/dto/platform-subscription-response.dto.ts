import { ApiProperty } from "@nestjs/swagger";
import type { TenantSubscription } from "../../../billing";

const STATUS_VALUES = ["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;

export class PlatformSubscriptionResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty({ example: "starter" }) planKey!: string;
  @ApiProperty({ enum: STATUS_VALUES }) status!: string;
  @ApiProperty() seatCount!: number;
  @ApiProperty({ type: String, nullable: true }) recurrenteCustomerId!: string | null;
  @ApiProperty({ type: String, nullable: true }) recurrenteSubscriptionId!: string | null;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(subscription: TenantSubscription, planKey: string): PlatformSubscriptionResponseDto {
    const dto = new PlatformSubscriptionResponseDto();
    dto.tenantId = subscription.tenantId;
    dto.planKey = planKey;
    dto.status = subscription.status;
    dto.seatCount = subscription.seatCount;
    dto.recurrenteCustomerId = subscription.recurrenteCustomerId;
    dto.recurrenteSubscriptionId = subscription.recurrenteSubscriptionId;
    dto.updatedAt = subscription.updatedAt.toISOString();
    return dto;
  }
}
