import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { PurchaseReceipt } from "../../domain/purchase-receipt.entity";
import type { PurchaseReceiptLine } from "../../domain/purchase-receipt-line.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreatePurchaseReceiptLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() purchaseOrderLineId!: string;
  @ApiProperty({ example: "5.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class CreatePurchaseReceiptDto {
  @ApiProperty() @IsString() @IsNotEmpty() purchaseOrderId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiProperty({ type: [CreatePurchaseReceiptLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReceiptLineDto)
  lines!: CreatePurchaseReceiptLineDto[];
}

export class ListPurchaseReceiptsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PurchaseReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(receipt: PurchaseReceipt): PurchaseReceiptResponseDto {
    const dto = new PurchaseReceiptResponseDto();
    dto.id = receipt.id;
    dto.purchaseOrderId = receipt.purchaseOrderId;
    dto.notes = receipt.notes;
    dto.createdAt = receipt.createdAt.toISOString();
    return dto;
  }
}

export class PurchaseReceiptLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseReceiptId!: string;
  @ApiProperty() purchaseOrderLineId!: string;
  @ApiProperty({ example: "5.0000" }) quantity!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: PurchaseReceiptLine): PurchaseReceiptLineResponseDto {
    const dto = new PurchaseReceiptLineResponseDto();
    dto.id = line.id;
    dto.purchaseReceiptId = line.purchaseReceiptId;
    dto.purchaseOrderLineId = line.purchaseOrderLineId;
    dto.quantity = line.quantity;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}
