import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { PosReturn } from "../../domain/pos-return.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER"] as const;

export class CreatePosReturnLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() salesOrderLineId!: string;
  @ApiProperty({ example: "1.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class CreatePosReturnDto {
  @ApiProperty() @IsString() @IsNotEmpty() shiftId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() posSaleId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiProperty({ description: "Whether to fully refund the original sale's payment." }) @IsBoolean() issueRefund!: boolean;
  @ApiProperty({ description: "Idempotency key for this terminal attempt — a retry with the same key returns the original return." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
  @ApiProperty({ type: [CreatePosReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePosReturnLineDto)
  lines!: CreatePosReturnLineDto[];
}

export class ListPosReturnsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() shiftId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PosReturnResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() shiftId!: string;
  @ApiProperty() posSaleId!: string;
  @ApiProperty() salesReturnId!: string;
  @ApiProperty() refunded!: boolean;
  @ApiProperty({ type: String, nullable: true, example: "42.5000" }) refundAmount!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: PAYMENT_METHODS }) refundMethod!: string | null;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(posReturn: PosReturn): PosReturnResponseDto {
    const dto = new PosReturnResponseDto();
    dto.id = posReturn.id;
    dto.shiftId = posReturn.shiftId;
    dto.posSaleId = posReturn.posSaleId;
    dto.salesReturnId = posReturn.salesReturnId;
    dto.refunded = posReturn.refunded;
    dto.refundAmount = posReturn.refundAmount;
    dto.refundMethod = posReturn.refundMethod;
    dto.reason = posReturn.reason;
    dto.createdAt = posReturn.createdAt.toISOString();
    return dto;
  }
}
