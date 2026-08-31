import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { Brand } from "../../domain/brand.entity";

export class CreateBrandDto {
  @ApiProperty({ example: "ACME" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Acme Inc." }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class UpdateBrandDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class SetBrandStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class BrandResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(brand: Brand): BrandResponseDto {
    const dto = new BrandResponseDto();
    dto.id = brand.id;
    dto.code = brand.code;
    dto.name = brand.name;
    dto.status = brand.status;
    dto.createdAt = brand.createdAt.toISOString();
    dto.updatedAt = brand.updatedAt.toISOString();
    return dto;
  }
}
