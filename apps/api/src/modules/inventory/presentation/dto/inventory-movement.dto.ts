import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import type { InventoryMovement } from "../../domain/inventory-movement.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const QUANTITY_MESSAGE = "quantity must be a positive decimal string with up to 4 fraction digits.";

export class ListInventoryMovementsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productVariantId?: string;
  @ApiPropertyOptional({ enum: ["TRANSFER", "RESERVATION", "MANUAL", "SALES_ORDER", "SALES_RETURN"] })
  @IsOptional()
  @IsIn(["TRANSFER", "RESERVATION", "MANUAL", "SALES_ORDER", "SALES_RETURN"])
  referenceType?: "TRANSFER" | "RESERVATION" | "MANUAL" | "SALES_ORDER" | "SALES_RETURN";
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class RecordReceiptDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty({ example: "50.0000" }) @Matches(POSITIVE_DECIMAL, { message: QUANTITY_MESSAGE }) quantity!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class RecordIssueDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty({ example: "5.0000" }) @Matches(POSITIVE_DECIMAL, { message: QUANTITY_MESSAGE }) quantity!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class RecordReturnDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty({ example: "2.0000" }) @Matches(POSITIVE_DECIMAL, { message: QUANTITY_MESSAGE }) quantity!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AdjustInventoryDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty({ required: false, description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiProperty({ enum: ["INCREASE", "DECREASE"] }) @IsIn(["INCREASE", "DECREASE"]) direction!: "INCREASE" | "DECREASE";
  @ApiProperty({ example: "3.0000" }) @Matches(POSITIVE_DECIMAL, { message: QUANTITY_MESSAGE }) quantity!: string;
  @ApiProperty({ description: "Mandatory — every adjustment must explain the correction (MASTER_SPEC §10)." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class InventoryMovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty({
    enum: [
      "RECEIPT",
      "ISSUE",
      "ADJUSTMENT",
      "TRANSFER_OUT",
      "TRANSFER_IN",
      "TRANSFER_CANCELLED",
      "RESERVATION",
      "RELEASE",
      "RETURN",
    ],
  })
  type!: string;
  @ApiProperty({ example: "-5.0000", description: "Signed — the exact delta this row applied." }) quantity!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: ["TRANSFER", "RESERVATION", "MANUAL", "SALES_ORDER", "SALES_RETURN"] })
  referenceType!: string | null;
  @ApiProperty({ type: String, nullable: true }) referenceId!: string | null;
  @ApiProperty() correlationId!: string;
  @ApiProperty() createdByUserId!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(movement: InventoryMovement): InventoryMovementResponseDto {
    const dto = new InventoryMovementResponseDto();
    dto.id = movement.id;
    dto.warehouseId = movement.warehouseId;
    dto.productId = movement.productId;
    dto.productVariantId = movement.productVariantId;
    dto.type = movement.type;
    dto.quantity = movement.quantity;
    dto.reason = movement.reason;
    dto.referenceType = movement.referenceType;
    dto.referenceId = movement.referenceId;
    dto.correlationId = movement.correlationId;
    dto.createdByUserId = movement.createdByUserId;
    dto.createdAt = movement.createdAt.toISOString();
    return dto;
  }
}
