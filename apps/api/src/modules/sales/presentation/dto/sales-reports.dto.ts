import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import type { TopSellingProduct } from "../../application/use-cases/get-top-selling-products.use-case";

export class TopSellingProductsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 365, default: 30, description: "Ventana en días." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class TopSellingProductResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productCode!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ example: "12.0000" }) quantity!: string;
  @ApiProperty({ example: "1250.0000" }) revenue!: string;

  static fromDomain(item: TopSellingProduct): TopSellingProductResponseDto {
    const dto = new TopSellingProductResponseDto();
    dto.productId = item.productId;
    dto.productCode = item.productCode;
    dto.productName = item.productName;
    dto.quantity = item.quantity;
    dto.revenue = item.revenue;
    return dto;
  }
}
