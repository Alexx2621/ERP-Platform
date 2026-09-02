import { ApiProperty } from "@nestjs/swagger";
import type { ProductVariant } from "../../../catalog";
import type { PublishedProductDetail } from "../../application/use-cases/get-published-product.use-case";
import type { PublishedProductSummary } from "../../application/use-cases/list-published-products.use-case";

export class PublicProductSummaryResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() hasVariants!: boolean;
  @ApiProperty({ nullable: true, type: String }) basePrice!: string | null;

  static fromSummary(summary: PublishedProductSummary): PublicProductSummaryResponseDto {
    const dto = new PublicProductSummaryResponseDto();
    dto.productId = summary.productId;
    dto.code = summary.code;
    dto.name = summary.name;
    dto.description = summary.description;
    dto.hasVariants = summary.hasVariants;
    dto.basePrice = summary.basePrice;
    return dto;
  }
}

export class PublicProductVariantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() price!: string;
  @ApiProperty({ type: Object }) attributes!: Record<string, unknown>;

  static fromDomain(variant: ProductVariant): PublicProductVariantResponseDto {
    const dto = new PublicProductVariantResponseDto();
    dto.id = variant.id;
    dto.sku = variant.sku;
    dto.price = variant.price;
    dto.attributes = variant.attributes as Record<string, unknown>;
    return dto;
  }
}

export class PublicProductDetailResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() hasVariants!: boolean;
  @ApiProperty({ nullable: true, type: String }) basePrice!: string | null;
  @ApiProperty({ type: [PublicProductVariantResponseDto] }) variants!: PublicProductVariantResponseDto[];

  static fromDetail(detail: PublishedProductDetail): PublicProductDetailResponseDto {
    const dto = new PublicProductDetailResponseDto();
    dto.productId = detail.product.id;
    dto.code = detail.product.code;
    dto.name = detail.product.name;
    dto.description = detail.product.description;
    dto.hasVariants = detail.product.hasVariants;
    dto.basePrice = detail.product.basePrice;
    dto.variants = detail.variants.map(PublicProductVariantResponseDto.fromDomain);
    return dto;
  }
}
