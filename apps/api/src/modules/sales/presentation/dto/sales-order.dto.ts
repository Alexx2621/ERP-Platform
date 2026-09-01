import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { SalesChannel } from "../../domain/quote.entity";
import type { SalesOrder } from "../../domain/sales-order.entity";

const CHANNELS = ["ERP", "POS", "ECOMMERCE", "B2B", "MARKETPLACE", "MOBILE", "API"] as const;
const STATUSES = ["DRAFT", "CONFIRMED", "FULFILLED", "CANCELLED"] as const;

export class CreateSalesOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiPropertyOptional({ enum: CHANNELS }) @IsOptional() @IsIn(CHANNELS) channel?: SalesChannel;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
}

export class ListSalesOrdersQueryDto {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SalesOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty({ type: String, nullable: true }) quoteId!: string | null;
  @ApiProperty({ enum: CHANNELS }) channel!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) confirmedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) fulfilledAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(order: SalesOrder): SalesOrderResponseDto {
    const dto = new SalesOrderResponseDto();
    dto.id = order.id;
    dto.customerId = order.customerId;
    dto.quoteId = order.quoteId;
    dto.channel = order.channel;
    dto.status = order.status;
    dto.currency = order.currency;
    dto.version = order.version;
    dto.createdAt = order.createdAt.toISOString();
    dto.updatedAt = order.updatedAt.toISOString();
    dto.confirmedAt = order.confirmedAt ? order.confirmedAt.toISOString() : null;
    dto.fulfilledAt = order.fulfilledAt ? order.fulfilledAt.toISOString() : null;
    dto.cancelledAt = order.cancelledAt ? order.cancelledAt.toISOString() : null;
    return dto;
  }
}
