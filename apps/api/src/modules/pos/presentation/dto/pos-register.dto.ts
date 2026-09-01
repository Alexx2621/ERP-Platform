import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { PosRegister } from "../../domain/pos-register.entity";

const STATUSES = ["ACTIVE", "INACTIVE"] as const;

export class CreatePosRegisterDto {
  @ApiProperty() @IsString() @IsNotEmpty() warehouseId!: string;
  @ApiProperty({ example: "REG-1" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Caja principal" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class SetPosRegisterStatusDto {
  @ApiProperty({ enum: STATUSES }) @IsIn(STATUSES) status!: (typeof STATUSES)[number];
}

export class ListPosRegistersQueryDto {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PosRegisterResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(register: PosRegister): PosRegisterResponseDto {
    const dto = new PosRegisterResponseDto();
    dto.id = register.id;
    dto.warehouseId = register.warehouseId;
    dto.code = register.code;
    dto.name = register.name;
    dto.status = register.status;
    dto.version = register.version;
    dto.createdAt = register.createdAt.toISOString();
    dto.updatedAt = register.updatedAt.toISOString();
    return dto;
  }
}
