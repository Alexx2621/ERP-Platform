import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsString, MaxLength } from "class-validator";
import type { Tax } from "../../domain/tax.entity";

export class CreateTaxDto {
  @ApiProperty({ example: "IVA" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "IVA" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ example: "12.0000", description: "Percentage, e.g. 12.0000 means 12%." })
  @IsNumberString()
  rate!: string;
}

export class UpdateTaxDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ example: "12.0000" }) @IsNumberString() rate!: string;
}

export class SetTaxStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class TaxResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() rate!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(tax: Tax): TaxResponseDto {
    const dto = new TaxResponseDto();
    dto.id = tax.id;
    dto.code = tax.code;
    dto.name = tax.name;
    dto.rate = tax.rate;
    dto.status = tax.status;
    dto.createdAt = tax.createdAt.toISOString();
    dto.updatedAt = tax.updatedAt.toISOString();
    return dto;
  }
}
