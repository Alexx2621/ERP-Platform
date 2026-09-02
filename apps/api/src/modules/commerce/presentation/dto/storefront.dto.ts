import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { Storefront } from "../../domain/storefront.entity";

const STATUSES = ["ACTIVE", "INACTIVE"] as const;

export class CreateStorefrontDto {
  @ApiProperty({ example: "main-store", description: "Globally unique, 2-63 lowercase letters/digits/hyphens." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  code!: string;

  @ApiProperty({ example: "Tienda principal" }) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() currency!: string;

  @ApiPropertyOptional({ example: "shop.example.com", description: "Informational only — no real DNS/hosting is wired to this." })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() defaultWarehouseId?: string | null;
}

export class SetStorefrontStatusDto {
  @ApiProperty({ enum: STATUSES }) @IsIn(STATUSES) status!: (typeof STATUSES)[number];
}

export class ListStorefrontsQueryDto {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class StorefrontResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) domain!: string | null;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) defaultWarehouseId!: string | null;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(storefront: Storefront): StorefrontResponseDto {
    const dto = new StorefrontResponseDto();
    dto.id = storefront.id;
    dto.code = storefront.code;
    dto.name = storefront.name;
    dto.domain = storefront.domain;
    dto.currency = storefront.currency;
    dto.defaultWarehouseId = storefront.defaultWarehouseId;
    dto.status = storefront.status;
    dto.version = storefront.version;
    dto.createdAt = storefront.createdAt.toISOString();
    dto.updatedAt = storefront.updatedAt.toISOString();
    return dto;
  }
}
