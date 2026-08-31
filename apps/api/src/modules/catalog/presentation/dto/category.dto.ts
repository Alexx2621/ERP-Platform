import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { Category } from "../../domain/category.entity";

export class CreateCategoryDto {
  @ApiProperty({ example: "ELECTRONICS" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Electrónica" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ required: false, description: "Parent category id." })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ required: false, nullable: true, type: String, description: "Set to null to detach from any parent." })
  @IsOptional()
  parentId?: string | null;
}

export class SetCategoryStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) parentId!: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.parentId = category.parentId;
    dto.code = category.code;
    dto.name = category.name;
    dto.status = category.status;
    dto.createdAt = category.createdAt.toISOString();
    dto.updatedAt = category.updatedAt.toISOString();
    return dto;
  }
}
