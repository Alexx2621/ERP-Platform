import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { Warehouse } from "../../domain/warehouse.entity";

export class CreateWarehouseDto {
  @ApiProperty({ example: "WH-01" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Bodega Central" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(255) addressLine?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiProperty({ required: false, example: "GT", description: "ISO 3166-1 alpha-2." })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

/**
 * Every optional field uses the three-state contract: omit to leave the
 * current value unchanged, send "" to clear it, send a real value to
 * replace it — see UpdateWarehouseUseCase's docstring.
 */
export class UpdateWarehouseDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(255) addressLine?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiProperty({ required: false, description: 'Omit to keep, "" to clear.' }) @IsOptional() @IsString() @MaxLength(2) country?: string;
}

export class SetWarehouseStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class WarehouseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) addressLine!: string | null;
  @ApiProperty({ type: String, nullable: true }) city!: string | null;
  @ApiProperty({ type: String, nullable: true }) country!: string | null;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(warehouse: Warehouse): WarehouseResponseDto {
    const dto = new WarehouseResponseDto();
    dto.id = warehouse.id;
    dto.code = warehouse.code;
    dto.name = warehouse.name;
    dto.addressLine = warehouse.addressLine;
    dto.city = warehouse.city;
    dto.country = warehouse.country;
    dto.status = warehouse.status;
    dto.createdAt = warehouse.createdAt.toISOString();
    dto.updatedAt = warehouse.updatedAt.toISOString();
    return dto;
  }
}
