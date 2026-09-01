import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import type { SalesOrderLine } from "../../domain/sales-order-line.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const NON_NEGATIVE_MESSAGE = "must be a non-negative decimal string with up to 4 fraction digits.";

export class AddSalesOrderLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional({ description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiPropertyOptional({ description: "Required only if the product tracks inventory." })
  @IsOptional()
  @IsString()
  warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional({ description: "Snapshot from this price list when the product has no variants." })
  @IsOptional()
  @IsString()
  priceListId?: string;
  @ApiProperty({ example: "2.0000" }) @Matches(POSITIVE_DECIMAL, { message: `quantity ${NON_NEGATIVE_MESSAGE}` }) quantity!: string;
  @ApiPropertyOptional({ description: "Overrides the resolved default (variant/product price or price-list snapshot)." })
  @IsOptional()
  @Matches(POSITIVE_DECIMAL, { message: `unitPrice ${NON_NEGATIVE_MESSAGE}` })
  unitPrice?: string;
  @ApiPropertyOptional({ example: "0.0000" })
  @IsOptional()
  @Matches(POSITIVE_DECIMAL, { message: `discountAmount ${NON_NEGATIVE_MESSAGE}` })
  discountAmount?: string;
}

export class SalesOrderLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salesOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) warehouseId!: string | null;
  @ApiProperty() productId!: string;
  @ApiProperty({ type: String, nullable: true }) productVariantId!: string | null;
  @ApiProperty({ type: String, nullable: true }) taxId!: string | null;
  @ApiProperty({ example: "2.0000" }) quantity!: string;
  @ApiProperty({ example: "19.9900" }) unitPrice!: string;
  @ApiProperty({ example: "0.0000" }) discountAmount!: string;
  @ApiProperty({ example: "12.0000" }) taxRate!: string;
  @ApiProperty({ example: "44.7776" }) lineTotal!: string;
  @ApiProperty({ type: String, nullable: true, description: "Set once, on confirm — never cleared afterward." })
  reservationId!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: SalesOrderLine): SalesOrderLineResponseDto {
    const dto = new SalesOrderLineResponseDto();
    dto.id = line.id;
    dto.salesOrderId = line.salesOrderId;
    dto.warehouseId = line.warehouseId;
    dto.productId = line.productId;
    dto.productVariantId = line.productVariantId;
    dto.taxId = line.taxId;
    dto.quantity = line.quantity;
    dto.unitPrice = line.unitPrice;
    dto.discountAmount = line.discountAmount;
    dto.taxRate = line.taxRate;
    dto.lineTotal = line.lineTotal;
    dto.reservationId = line.reservationId;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}
