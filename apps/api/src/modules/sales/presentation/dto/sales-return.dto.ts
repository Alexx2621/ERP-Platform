import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { SalesReturn } from "../../domain/sales-return.entity";
import type { SalesReturnLine } from "../../domain/sales-return-line.entity";

const POSITIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreateSalesReturnLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() salesOrderLineId!: string;
  @ApiProperty({ example: "1.0000" })
  @Matches(POSITIVE_DECIMAL, { message: "quantity must be a positive decimal string with up to 4 fraction digits." })
  quantity!: string;
}

export class CreateSalesReturnDto {
  @ApiProperty() @IsString() @IsNotEmpty() salesOrderId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiProperty({ type: [CreateSalesReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnLineDto)
  lines!: CreateSalesReturnLineDto[];
}

export class ListSalesReturnsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() salesOrderId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SalesReturnResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salesOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(salesReturn: SalesReturn): SalesReturnResponseDto {
    const dto = new SalesReturnResponseDto();
    dto.id = salesReturn.id;
    dto.salesOrderId = salesReturn.salesOrderId;
    dto.reason = salesReturn.reason;
    dto.createdAt = salesReturn.createdAt.toISOString();
    return dto;
  }
}

export class SalesReturnLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salesReturnId!: string;
  @ApiProperty() salesOrderLineId!: string;
  @ApiProperty({ example: "1.0000" }) quantity!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: SalesReturnLine): SalesReturnLineResponseDto {
    const dto = new SalesReturnLineResponseDto();
    dto.id = line.id;
    dto.salesReturnId = line.salesReturnId;
    dto.salesOrderLineId = line.salesOrderLineId;
    dto.quantity = line.quantity;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}
