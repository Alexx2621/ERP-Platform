import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { FiscalPeriod } from "../../domain/fiscal-period.entity";

export class CreateFiscalPeriodDto {
  @ApiProperty({ example: "2026-01" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "January 2026" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ example: "2026-01-01" }) @IsDateString() startDate!: string;
  @ApiProperty({ example: "2026-01-31" }) @IsDateString() endDate!: string;
}

export class FiscalPeriodResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: "date-time", type: String }) startDate!: string;
  @ApiProperty({ format: "date-time", type: String }) endDate!: string;
  @ApiProperty({ enum: ["OPEN", "CLOSED"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) closedAt!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(period: FiscalPeriod): FiscalPeriodResponseDto {
    const dto = new FiscalPeriodResponseDto();
    dto.id = period.id;
    dto.code = period.code;
    dto.name = period.name;
    dto.startDate = period.startDate.toISOString();
    dto.endDate = period.endDate.toISOString();
    dto.status = period.status;
    dto.closedAt = period.closedAt ? period.closedAt.toISOString() : null;
    dto.createdAt = period.createdAt.toISOString();
    dto.updatedAt = period.updatedAt.toISOString();
    return dto;
  }
}
