import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import type { PurchaseOrderLine } from "../../domain/purchase-order-line.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const NON_NEGATIVE_MESSAGE = "must be a non-negative decimal string with up to 4 fraction digits.";

export class AddPurchaseOrderLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional({ description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiPropertyOptional({ description: "Required only if the product tracks inventory." })
  @IsOptional()
  @IsString()
  warehouseId?: string;
  @ApiProperty({ example: "10.0000" }) @Matches(POSITIVE_DECIMAL, { message: `quantity ${NON_NEGATIVE_MESSAGE}` }) quantity!: string;
  @ApiPropertyOptional({ description: "Overrides the resolved default (variant/product cost)." })
  @IsOptional()
  @Matches(POSITIVE_DECIMAL, { message: `unitCost ${NON_NEGATIVE_MESSAGE}` })
  unitCost?: string;
}

export class PurchaseOrderLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) warehouseId!: string | null;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty({ example: "10.0000" }) quantity!: string;
  @ApiProperty({ example: "5.5000" }) unitCost!: string;
  @ApiProperty({ example: "55.0000" }) lineTotal!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: PurchaseOrderLine): PurchaseOrderLineResponseDto {
    const dto = new PurchaseOrderLineResponseDto();
    dto.id = line.id;
    dto.purchaseOrderId = line.purchaseOrderId;
    dto.warehouseId = line.warehouseId;
    dto.productId = line.productId;
    dto.productVariantId = line.productVariantId;
    dto.quantity = line.quantity;
    dto.unitCost = line.unitCost;
    dto.lineTotal = line.lineTotal;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}
