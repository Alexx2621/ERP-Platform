import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, IsString } from "class-validator";
import type { PriceListItem } from "../../domain/price-list-item.entity";

export class AddPriceListItemDto {
  @ApiProperty({ description: "Product id. Products with variants are not supported in this slice." })
  @IsString()
  @IsNotEmpty()
  productId!: string;
  @ApiProperty({ example: "24.9900" }) @IsNumberString() price!: string;
}

export class UpdatePriceListItemDto {
  @ApiProperty({ example: "24.9900" }) @IsNumberString() price!: string;
}

export class PriceListItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() priceListId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() price!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(item: PriceListItem): PriceListItemResponseDto {
    const dto = new PriceListItemResponseDto();
    dto.id = item.id;
    dto.priceListId = item.priceListId;
    dto.productId = item.productId;
    dto.price = item.price;
    dto.createdAt = item.createdAt.toISOString();
    dto.updatedAt = item.updatedAt.toISOString();
    return dto;
  }
}
