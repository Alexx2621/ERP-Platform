import { ApiProperty } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import type { ProductVariant } from "../../domain/product-variant.entity";

export class AddProductVariantDto {
  @ApiProperty({ example: "SKU-001-BLU-M" }) @IsString() @IsNotEmpty() @MaxLength(64) sku!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(64) barcode?: string;
  @ApiProperty({ example: { color: "Azul", size: "M" }, type: Object })
  @IsObject()
  attributes!: Record<string, string>;
  @ApiProperty({ example: "24.9900" }) @IsNumberString() price!: string;
  @ApiProperty({ required: false, example: "12.0000" }) @IsOptional() @IsNumberString() cost?: string;
}

/** cost: omit to keep the current cost, send "" to clear it, send a value to replace it. */
export class UpdateProductVariantDto {
  @ApiProperty() @IsNumberString() price!: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear, or a decimal string to replace.' })
  @IsOptional()
  @ValidateIf((o: UpdateProductVariantDto) => o.cost !== "")
  @IsNumberString()
  cost?: string;
}

export class SetProductVariantStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class ProductVariantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ type: String, nullable: true }) barcode!: string | null;
  @ApiProperty({ type: Object }) attributes!: Record<string, string>;
  @ApiProperty() price!: string;
  @ApiProperty({ type: String, nullable: true }) cost!: string | null;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(variant: ProductVariant): ProductVariantResponseDto {
    const dto = new ProductVariantResponseDto();
    dto.id = variant.id;
    dto.productId = variant.productId;
    dto.sku = variant.sku;
    dto.barcode = variant.barcode;
    dto.attributes = variant.attributes as Record<string, string>;
    dto.price = variant.price;
    dto.cost = variant.cost;
    dto.status = variant.status;
    dto.createdAt = variant.createdAt.toISOString();
    dto.updatedAt = variant.updatedAt.toISOString();
    return dto;
  }
}
