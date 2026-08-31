import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import type { InventoryTransfer } from "../../domain/inventory-transfer.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class ListInventoryTransfersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional({ enum: ["IN_TRANSIT", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["IN_TRANSIT", "COMPLETED", "CANCELLED"])
  status?: "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CreateTransferDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() sourceWarehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() destinationWarehouseId!: string;
  @ApiProperty({ example: "25.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class InventoryTransferResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty() sourceWarehouseId!: string;
  @ApiProperty() destinationWarehouseId!: string;
  @ApiProperty({ example: "25.0000" }) quantity!: string;
  @ApiProperty({ enum: ["IN_TRANSIT", "COMPLETED", "CANCELLED"] }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) completedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(transfer: InventoryTransfer): InventoryTransferResponseDto {
    const dto = new InventoryTransferResponseDto();
    dto.id = transfer.id;
    dto.productId = transfer.productId;
    dto.productVariantId = transfer.productVariantId;
    dto.sourceWarehouseId = transfer.sourceWarehouseId;
    dto.destinationWarehouseId = transfer.destinationWarehouseId;
    dto.quantity = transfer.quantity;
    dto.status = transfer.status;
    dto.version = transfer.version;
    dto.createdAt = transfer.createdAt.toISOString();
    dto.completedAt = transfer.completedAt ? transfer.completedAt.toISOString() : null;
    dto.cancelledAt = transfer.cancelledAt ? transfer.cancelledAt.toISOString() : null;
    return dto;
  }
}
