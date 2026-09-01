import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { PurchaseReturn } from "../../domain/purchase-return.entity";
import type { PurchaseReturnLine } from "../../domain/purchase-return-line.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreatePurchaseReturnLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() purchaseOrderLineId!: string;
  @ApiProperty({ example: "1.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class CreatePurchaseReturnDto {
  @ApiProperty() @IsString() @IsNotEmpty() purchaseOrderId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiProperty({ type: [CreatePurchaseReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnLineDto)
  lines!: CreatePurchaseReturnLineDto[];
}

export class ListPurchaseReturnsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PurchaseReturnResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(purchaseReturn: PurchaseReturn): PurchaseReturnResponseDto {
    const dto = new PurchaseReturnResponseDto();
    dto.id = purchaseReturn.id;
    dto.purchaseOrderId = purchaseReturn.purchaseOrderId;
    dto.reason = purchaseReturn.reason;
    dto.createdAt = purchaseReturn.createdAt.toISOString();
    return dto;
  }
}

export class PurchaseReturnLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseReturnId!: string;
  @ApiProperty() purchaseOrderLineId!: string;
  @ApiProperty({ example: "1.0000" }) quantity!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: PurchaseReturnLine): PurchaseReturnLineResponseDto {
    const dto = new PurchaseReturnLineResponseDto();
    dto.id = line.id;
    dto.purchaseReturnId = line.purchaseReturnId;
    dto.purchaseOrderLineId = line.purchaseOrderLineId;
    dto.quantity = line.quantity;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}
