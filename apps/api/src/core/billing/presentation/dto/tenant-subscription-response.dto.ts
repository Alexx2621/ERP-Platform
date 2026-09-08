import { ApiProperty } from "@nestjs/swagger";
import type { TenantSubscription } from "../../domain/tenant-subscription.entity";

const STATUS_VALUES = ["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;

export class TenantSubscriptionResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty({ example: "starter" }) planKey!: string;
  @ApiProperty({ enum: STATUS_VALUES }) status!: string;
  @ApiProperty() seatCount!: number;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) currentPeriodStart!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) currentPeriodEnd!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) cancelledAt!: string | null;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(subscription: TenantSubscription, planKey: string): TenantSubscriptionResponseDto {
    const dto = new TenantSubscriptionResponseDto();
    dto.tenantId = subscription.tenantId;
    dto.planKey = planKey;
    dto.status = subscription.status;
    dto.seatCount = subscription.seatCount;
    dto.currentPeriodStart = subscription.currentPeriodStart?.toISOString() ?? null;
    dto.currentPeriodEnd = subscription.currentPeriodEnd?.toISOString() ?? null;
    dto.cancelledAt = subscription.cancelledAt?.toISOString() ?? null;
    dto.updatedAt = subscription.updatedAt.toISOString();
    return dto;
  }
}
