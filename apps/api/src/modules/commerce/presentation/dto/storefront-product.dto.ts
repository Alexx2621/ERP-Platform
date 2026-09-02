import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import type { StorefrontProductWithProduct } from "../../application/use-cases/list-storefront-products.use-case";

export class PublishProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
}

export class ListStorefrontProductsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class StorefrontProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productCode!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ enum: ["PUBLISHED", "UNPUBLISHED"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) publishedAt!: string;

  static fromDomain(row: StorefrontProductWithProduct): StorefrontProductResponseDto {
    const dto = new StorefrontProductResponseDto();
    dto.id = row.publication.id;
    dto.productId = row.publication.productId;
    dto.productCode = row.productCode;
    dto.productName = row.productName;
    dto.status = row.publication.status;
    dto.publishedAt = row.publication.publishedAt.toISOString();
    return dto;
  }
}
