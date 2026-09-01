import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { Quote, SalesChannel } from "../../domain/quote.entity";

const CHANNELS = ["ERP", "POS", "ECOMMERCE", "B2B", "MARKETPLACE", "MOBILE", "API"] as const;

export class CreateQuoteDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiPropertyOptional({ enum: CHANNELS }) @IsOptional() @IsIn(CHANNELS) channel?: SalesChannel;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ListQuotesQueryDto {
  @ApiPropertyOptional({ enum: ["DRAFT", "CONVERTED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["DRAFT", "CONVERTED", "CANCELLED"])
  status?: "DRAFT" | "CONVERTED" | "CANCELLED";
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class ConvertQuoteDto {
  @ApiPropertyOptional({ description: "Applied to every converted line whose product tracks inventory." })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class QuoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty({ enum: CHANNELS }) channel!: string;
  @ApiProperty({ enum: ["DRAFT", "CONVERTED", "CANCELLED"] }) status!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) convertedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) cancelledAt!: string | null;

  static fromDomain(quote: Quote): QuoteResponseDto {
    const dto = new QuoteResponseDto();
    dto.id = quote.id;
    dto.customerId = quote.customerId;
    dto.channel = quote.channel;
    dto.status = quote.status;
    dto.currency = quote.currency;
    dto.notes = quote.notes;
    dto.version = quote.version;
    dto.createdAt = quote.createdAt.toISOString();
    dto.updatedAt = quote.updatedAt.toISOString();
    dto.convertedAt = quote.convertedAt ? quote.convertedAt.toISOString() : null;
    dto.cancelledAt = quote.cancelledAt ? quote.cancelledAt.toISOString() : null;
    return dto;
  }
}
