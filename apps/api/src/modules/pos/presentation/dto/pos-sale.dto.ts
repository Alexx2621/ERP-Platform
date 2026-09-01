import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { PosSale } from "../../domain/pos-sale.entity";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER"] as const;
const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const NON_NEGATIVE_MESSAGE = "must be a non-negative decimal string with up to 4 fraction digits.";

export class RingUpSaleLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional({ description: "Required only if the product has variants." })
  @IsOptional()
  @IsString()
  productVariantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiProperty({ example: "1.0000" }) @Matches(POSITIVE_DECIMAL, { message: `quantity ${NON_NEGATIVE_MESSAGE}` }) quantity!: string;
  @ApiPropertyOptional({ description: "Overrides the resolved default (variant/product base price)." })
  @IsOptional()
  @Matches(POSITIVE_DECIMAL, { message: `unitPrice ${NON_NEGATIVE_MESSAGE}` })
  unitPrice?: string;
  @ApiPropertyOptional({ example: "0.0000" })
  @IsOptional()
  @Matches(POSITIVE_DECIMAL, { message: `discountAmount ${NON_NEGATIVE_MESSAGE}` })
  discountAmount?: string;
}

export class RingUpSaleDto {
  @ApiProperty() @IsString() @IsNotEmpty() shiftId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) @IsIn(PAYMENT_METHODS) paymentMethod!: (typeof PAYMENT_METHODS)[number];
  @ApiPropertyOptional({ description: "Required for BANK_TRANSFER." }) @IsOptional() @IsString() @MaxLength(200) paymentReference?: string;
  @ApiPropertyOptional({ description: "Cash handed over by the customer — used only to compute changeDue." })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/, { message: `amountTendered ${NON_NEGATIVE_MESSAGE}` })
  amountTendered?: string;
  @ApiProperty({ description: "Idempotency key for this terminal attempt — a retry with the same key returns the original sale." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
  @ApiProperty({ type: [RingUpSaleLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RingUpSaleLineDto)
  lines!: RingUpSaleLineDto[];
}

export class ListPosSalesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() shiftId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PosSaleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() shiftId!: string;
  @ApiProperty() salesOrderId!: string;
  @ApiProperty() paymentId!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: string;
  @ApiProperty({ example: "42.5000" }) amount!: string;
  @ApiProperty({ type: String, nullable: true, example: "50.0000" }) amountTendered!: string | null;
  @ApiProperty({ type: String, nullable: true, example: "7.5000" }) changeDue!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(sale: PosSale): PosSaleResponseDto {
    const dto = new PosSaleResponseDto();
    dto.id = sale.id;
    dto.shiftId = sale.shiftId;
    dto.salesOrderId = sale.salesOrderId;
    dto.paymentId = sale.paymentId;
    dto.paymentMethod = sale.paymentMethod;
    dto.amount = sale.amount;
    dto.amountTendered = sale.amountTendered;
    dto.changeDue = sale.changeDue;
    dto.createdAt = sale.createdAt.toISOString();
    return dto;
  }
}
