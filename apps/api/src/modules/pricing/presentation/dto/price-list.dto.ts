import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import type { PriceList } from "../../domain/price-list.entity";

export class CreatePriceListDto {
  @ApiProperty({ example: "WHOLESALE" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Mayoreo" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ example: "USD", description: "ISO 4217." }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiProperty({ required: false, example: "2026-01-01", description: "ISO date (YYYY-MM-DD)." })
  @IsOptional()
  @IsDateString()
  validFrom?: string;
  @ApiProperty({ required: false, example: "2026-12-31", description: "ISO date (YYYY-MM-DD)." })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

/**
 * `validFrom`/`validUntil` use the three-state contract: omit to leave the
 * current value unchanged, send "" to clear it, send a real ISO date to
 * replace it — see UpdatePriceListUseCase's docstring.
 */
export class UpdatePriceListDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ example: "USD" }) @IsString() @IsNotEmpty() @MaxLength(3) currency!: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear, or an ISO date to replace.' })
  @IsOptional()
  @ValidateIf((o: UpdatePriceListDto) => o.validFrom !== "")
  @IsDateString()
  validFrom?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear, or an ISO date to replace.' })
  @IsOptional()
  @ValidateIf((o: UpdatePriceListDto) => o.validUntil !== "")
  @IsDateString()
  validUntil?: string;
}

export class SetPriceListStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class PriceListResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: String, nullable: true, format: "date" }) validFrom!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date" }) validUntil!: string | null;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(priceList: PriceList): PriceListResponseDto {
    const dto = new PriceListResponseDto();
    dto.id = priceList.id;
    dto.code = priceList.code;
    dto.name = priceList.name;
    dto.currency = priceList.currency;
    dto.validFrom = priceList.validFrom ? priceList.validFrom.toISOString().slice(0, 10) : null;
    dto.validUntil = priceList.validUntil ? priceList.validUntil.toISOString().slice(0, 10) : null;
    dto.status = priceList.status;
    dto.createdAt = priceList.createdAt.toISOString();
    dto.updatedAt = priceList.updatedAt.toISOString();
    return dto;
  }
}
