import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from "class-validator";
import type { ProductionOrder } from "../../domain/production-order.entity";
import type { ProductionOrderMaterial } from "../../domain/production-order-material.entity";
import type { ProductionOrderMaterialMovement } from "../../domain/production-order-material-movement.entity";
import type { ProductionOrderFinishedGoodsReceipt } from "../../domain/production-order-finished-goods-receipt.entity";
import type { ProductionOrderMaterialSummary } from "../../application/use-cases/list-production-order-materials.use-case";

const STATUSES = ["DRAFT", "CONFIRMED", "CLOSED", "CANCELLED"] as const;
const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreateProductionOrderDto {
  @ApiProperty() @IsUUID() billOfMaterialId!: string;
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiProperty({ example: "10.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantityPlanned must be a positive decimal string with up to 4 fraction digits." })
  quantityPlanned!: string;
}

export class ListProductionOrdersQueryDto {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() billOfMaterialId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class IssueProductionOrderMaterialDto {
  @ApiProperty() @IsUUID() productionOrderMaterialId!: string;
  @ApiProperty({ example: "5.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class ReturnProductionOrderMaterialDto {
  @ApiProperty() @IsUUID() productionOrderMaterialId!: string;
  @ApiProperty({ example: "1.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class RecordFinishedGoodsDto {
  @ApiProperty({ example: "10.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class ProductionOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() billOfMaterialId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty({ example: "10.0000" }) quantityPlanned!: string;
  @ApiProperty({ example: "0.0000" }) quantityCompleted!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) confirmedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) closedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(order: ProductionOrder, quantityCompleted: string): ProductionOrderResponseDto {
    const dto = new ProductionOrderResponseDto();
    dto.id = order.id;
    dto.billOfMaterialId = order.billOfMaterialId;
    dto.productId = order.productId;
    dto.warehouseId = order.warehouseId;
    dto.quantityPlanned = order.quantityPlanned;
    dto.quantityCompleted = quantityCompleted;
    dto.status = order.status;
    dto.version = order.version;
    dto.createdAt = order.createdAt.toISOString();
    dto.updatedAt = order.updatedAt.toISOString();
    dto.confirmedAt = order.confirmedAt ? order.confirmedAt.toISOString() : null;
    dto.closedAt = order.closedAt ? order.closedAt.toISOString() : null;
    dto.cancelledAt = order.cancelledAt ? order.cancelledAt.toISOString() : null;
    return dto;
  }
}

export class ProductionOrderMaterialResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productionOrderId!: string;
  @ApiProperty() componentProductId!: string;
  @ApiProperty({ type: String, nullable: true }) componentVariantId!: string | null;
  @ApiProperty({ example: "20.0000" }) quantityRequired!: string;
  @ApiProperty({ example: "5.0000" }) quantityIssuedNet!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(material: ProductionOrderMaterial, quantityIssuedNet: string): ProductionOrderMaterialResponseDto {
    const dto = new ProductionOrderMaterialResponseDto();
    dto.id = material.id;
    dto.productionOrderId = material.productionOrderId;
    dto.componentProductId = material.componentProductId;
    dto.componentVariantId = material.componentVariantId;
    dto.quantityRequired = material.quantityRequired;
    dto.quantityIssuedNet = quantityIssuedNet;
    dto.createdAt = material.createdAt.toISOString();
    return dto;
  }

  static fromSummary(summary: ProductionOrderMaterialSummary): ProductionOrderMaterialResponseDto {
    return ProductionOrderMaterialResponseDto.fromDomain(summary.material, summary.quantityIssuedNet);
  }
}

export class ProductionOrderMaterialMovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productionOrderMaterialId!: string;
  @ApiProperty({ enum: ["ISSUE", "RETURN"] }) type!: string;
  @ApiProperty({ example: "5.0000" }) quantity!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(movement: ProductionOrderMaterialMovement): ProductionOrderMaterialMovementResponseDto {
    const dto = new ProductionOrderMaterialMovementResponseDto();
    dto.id = movement.id;
    dto.productionOrderMaterialId = movement.productionOrderMaterialId;
    dto.type = movement.type;
    dto.quantity = movement.quantity;
    dto.createdAt = movement.createdAt.toISOString();
    return dto;
  }
}

export class ProductionOrderFinishedGoodsReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productionOrderId!: string;
  @ApiProperty({ example: "10.0000" }) quantity!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(receipt: ProductionOrderFinishedGoodsReceipt): ProductionOrderFinishedGoodsReceiptResponseDto {
    const dto = new ProductionOrderFinishedGoodsReceiptResponseDto();
    dto.id = receipt.id;
    dto.productionOrderId = receipt.productionOrderId;
    dto.quantity = receipt.quantity;
    dto.createdAt = receipt.createdAt.toISOString();
    return dto;
  }
}
