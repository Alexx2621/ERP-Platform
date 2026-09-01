import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { PurchaseOrder } from "../../domain/purchase-order.entity";

const STATUSES = ["DRAFT", "CONFIRMED", "CLOSED", "CANCELLED"] as const;

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() supplierId!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ListPurchaseOrdersQueryDto {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) confirmedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) closedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(order: PurchaseOrder): PurchaseOrderResponseDto {
    const dto = new PurchaseOrderResponseDto();
    dto.id = order.id;
    dto.supplierId = order.supplierId;
    dto.status = order.status;
    dto.currency = order.currency;
    dto.notes = order.notes;
    dto.version = order.version;
    dto.createdAt = order.createdAt.toISOString();
    dto.updatedAt = order.updatedAt.toISOString();
    dto.confirmedAt = order.confirmedAt ? order.confirmedAt.toISOString() : null;
    dto.closedAt = order.closedAt ? order.closedAt.toISOString() : null;
    dto.cancelledAt = order.cancelledAt ? order.cancelledAt.toISOString() : null;
    return dto;
  }
}
