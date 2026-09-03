import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { BillOfMaterial } from "../../domain/bill-of-material.entity";
import type { BillOfMaterialComponent } from "../../domain/bill-of-material-component.entity";

const STATUSES = ["ACTIVE", "INACTIVE"] as const;
const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreateBillOfMaterialComponentDto {
  @ApiProperty() @IsUUID() componentProductId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() componentVariantId?: string;
  @ApiProperty({ example: "2.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantityPerUnit must be a positive decimal string with up to 4 fraction digits." })
  quantityPerUnit!: string;
}

export class CreateBillOfMaterialDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ type: [CreateBillOfMaterialComponentDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialComponentDto)
  components!: CreateBillOfMaterialComponentDto[];
}

export class SetBillOfMaterialStatusDto {
  @ApiProperty({ enum: STATUSES }) @IsIn(STATUSES) status!: (typeof STATUSES)[number];
}

export class ListBillOfMaterialsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class BillOfMaterialComponentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() billOfMaterialId!: string;
  @ApiProperty() componentProductId!: string;
  @ApiProperty({ type: String, nullable: true }) componentVariantId!: string | null;
  @ApiProperty({ example: "2.0000" }) quantityPerUnit!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(component: BillOfMaterialComponent): BillOfMaterialComponentResponseDto {
    const dto = new BillOfMaterialComponentResponseDto();
    dto.id = component.id;
    dto.billOfMaterialId = component.billOfMaterialId;
    dto.componentProductId = component.componentProductId;
    dto.componentVariantId = component.componentVariantId;
    dto.quantityPerUnit = component.quantityPerUnit;
    dto.createdAt = component.createdAt.toISOString();
    return dto;
  }
}

export class BillOfMaterialResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(billOfMaterial: BillOfMaterial): BillOfMaterialResponseDto {
    const dto = new BillOfMaterialResponseDto();
    dto.id = billOfMaterial.id;
    dto.productId = billOfMaterial.productId;
    dto.code = billOfMaterial.code;
    dto.name = billOfMaterial.name;
    dto.version = billOfMaterial.version;
    dto.status = billOfMaterial.status;
    dto.createdAt = billOfMaterial.createdAt.toISOString();
    dto.updatedAt = billOfMaterial.updatedAt.toISOString();
    return dto;
  }
}
