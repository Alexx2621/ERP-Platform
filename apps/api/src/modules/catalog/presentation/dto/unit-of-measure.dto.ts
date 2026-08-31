import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { UnitOfMeasure } from "../../domain/unit-of-measure.entity";

export class CreateUnitOfMeasureDto {
  @ApiProperty({ example: "UN" }) @IsString() @IsNotEmpty() @MaxLength(20) code!: string;
  @ApiProperty({ example: "Unidad" }) @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty({ example: "u" }) @IsString() @IsNotEmpty() @MaxLength(10) symbol!: string;
}

export class UpdateUnitOfMeasureDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(10) symbol!: string;
}

export class SetUnitOfMeasureStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class UnitOfMeasureResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() symbol!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(unit: UnitOfMeasure): UnitOfMeasureResponseDto {
    const dto = new UnitOfMeasureResponseDto();
    dto.id = unit.id;
    dto.code = unit.code;
    dto.name = unit.name;
    dto.symbol = unit.symbol;
    dto.status = unit.status;
    dto.createdAt = unit.createdAt.toISOString();
    dto.updatedAt = unit.updatedAt.toISOString();
    return dto;
  }
}
