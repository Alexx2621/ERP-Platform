import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import type { Payment } from "../../domain/payment.entity";

const METHODS = ["CASH", "BANK_TRANSFER"] as const;
const STATUSES = ["CAPTURED", "REFUNDED", "FAILED"] as const;
const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CapturePaymentDto {
  @ApiProperty() @IsString() @IsNotEmpty() salesOrderId!: string;
  @ApiProperty({ enum: METHODS }) @IsIn(METHODS) method!: (typeof METHODS)[number];
  @ApiProperty({ example: "150.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "amount must be a positive decimal string with up to 4 fraction digits." })
  amount!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiProperty({ description: "Deduplicates a retried capture request — see docs/ROADMAP.md §8." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
  @ApiPropertyOptional({ description: "Required for BANK_TRANSFER — the transfer confirmation number." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() salesOrderId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salesOrderId!: string;
  @ApiProperty({ enum: METHODS }) method!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty({ example: "150.0000" }) amount!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: String, nullable: true }) gatewayReference!: string | null;
  @ApiProperty({ type: String, nullable: true }) failureReason!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) capturedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) refundedAt!: string | null;

  static fromDomain(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.salesOrderId = payment.salesOrderId;
    dto.method = payment.method;
    dto.status = payment.status;
    dto.amount = payment.amount;
    dto.currency = payment.currency;
    dto.gatewayReference = payment.gatewayReference;
    dto.failureReason = payment.failureReason;
    dto.createdAt = payment.createdAt.toISOString();
    dto.capturedAt = payment.capturedAt ? payment.capturedAt.toISOString() : null;
    dto.refundedAt = payment.refundedAt ? payment.refundedAt.toISOString() : null;
    return dto;
  }
}
