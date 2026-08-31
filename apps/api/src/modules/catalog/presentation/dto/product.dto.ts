import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import type { Product } from "../../domain/product.entity";

const PRODUCT_TYPES = ["PHYSICAL_GOOD", "SERVICE", "DIGITAL_PRODUCT", "RAW_MATERIAL"] as const;
const PRODUCT_STATUSES = ["ACTIVE", "INACTIVE", "DISCONTINUED"] as const;

export class CreateProductDto {
  @ApiProperty({ example: "SKU-001" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Camisa de algodón" }) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: PRODUCT_TYPES, required: false }) @IsOptional() @IsIn(PRODUCT_TYPES) type?: string;
  @ApiProperty({ description: "Unit of measure id." }) @IsString() @IsNotEmpty() unitOfMeasureId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() brandId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(64) barcode?: string;
  @ApiProperty({ required: false, example: "19.9900", description: "Decimal string; required if sellable and hasVariants is false." })
  @IsOptional()
  @IsNumberString()
  basePrice?: string;
  @ApiProperty({ required: false, example: "9.5000" }) @IsOptional() @IsNumberString() baseCost?: string;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() trackInventory?: boolean;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() sellable?: boolean;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() purchasable?: boolean;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() hasVariants?: boolean;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() publishOnline?: boolean;
}

/**
 * Optional fields use a three-state contract: omit to leave the current
 * value unchanged, send "" to clear it, send a real value to replace it —
 * see UpdateProductUseCase's docstring.
 */
export class UpdateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() brandId?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(64) barcode?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear, or a decimal string to replace.' })
  @IsOptional()
  @ValidateIf((o: UpdateProductDto) => o.basePrice !== "")
  @IsNumberString()
  basePrice?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear, or a decimal string to replace.' })
  @IsOptional()
  @ValidateIf((o: UpdateProductDto) => o.baseCost !== "")
  @IsNumberString()
  baseCost?: string;
  @ApiProperty() @IsBoolean() trackInventory!: boolean;
  @ApiProperty() @IsBoolean() sellable!: boolean;
  @ApiProperty() @IsBoolean() purchasable!: boolean;
  @ApiProperty() @IsBoolean() publishOnline!: boolean;
}

export class SetProductStatusDto {
  @ApiProperty({ enum: PRODUCT_STATUSES })
  @IsIn(PRODUCT_STATUSES)
  status!: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
}

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) categoryId!: string | null;
  @ApiProperty({ type: String, nullable: true }) brandId!: string | null;
  @ApiProperty() unitOfMeasureId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ enum: PRODUCT_TYPES }) type!: string;
  @ApiProperty() trackInventory!: boolean;
  @ApiProperty() sellable!: boolean;
  @ApiProperty() purchasable!: boolean;
  @ApiProperty() hasVariants!: boolean;
  @ApiProperty() publishOnline!: boolean;
  @ApiProperty({ type: String, nullable: true }) barcode!: string | null;
  @ApiProperty({ type: String, nullable: true }) basePrice!: string | null;
  @ApiProperty({ type: String, nullable: true }) baseCost!: string | null;
  @ApiProperty({ enum: PRODUCT_STATUSES }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(product: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.categoryId = product.categoryId;
    dto.brandId = product.brandId;
    dto.unitOfMeasureId = product.unitOfMeasureId;
    dto.code = product.code;
    dto.name = product.name;
    dto.description = product.description;
    dto.type = product.type;
    dto.trackInventory = product.trackInventory;
    dto.sellable = product.sellable;
    dto.purchasable = product.purchasable;
    dto.hasVariants = product.hasVariants;
    dto.publishOnline = product.publishOnline;
    dto.barcode = product.barcode;
    dto.basePrice = product.basePrice;
    dto.baseCost = product.baseCost;
    dto.status = product.status;
    dto.createdAt = product.createdAt.toISOString();
    dto.updatedAt = product.updatedAt.toISOString();
    return dto;
  }
}
