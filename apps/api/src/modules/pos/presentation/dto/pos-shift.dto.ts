import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import type { PosShift } from "../../domain/pos-shift.entity";

const STATUSES = ["OPEN", "CLOSED"] as const;
const NON_NEGATIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;
const NON_NEGATIVE_MESSAGE = "must be a non-negative decimal string with up to 4 fraction digits.";

export class OpenShiftDto {
  @ApiProperty() @IsString() @IsNotEmpty() registerId!: string;
  @ApiProperty({ example: "50.0000" }) @Matches(NON_NEGATIVE_DECIMAL, { message: `openingCash ${NON_NEGATIVE_MESSAGE}` }) openingCash!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CloseShiftDto {
  @ApiProperty({ example: "150.0000" })
  @Matches(NON_NEGATIVE_DECIMAL, { message: `closingCashCounted ${NON_NEGATIVE_MESSAGE}` })
  closingCashCounted!: string;
}

export class ListPosShiftsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() registerId?: string;
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class PosShiftResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() registerId!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty() openedByUserId!: string;
  @ApiProperty({ format: "date-time", type: String }) openedAt!: string;
  @ApiProperty({ example: "50.0000" }) openingCash!: string;
  @ApiProperty({ type: String, nullable: true }) closedByUserId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) closedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, example: "150.0000" }) closingCashCounted!: string | null;
  @ApiProperty({ type: String, nullable: true, example: "148.5000" }) closingCashExpected!: string | null;
  @ApiProperty({ type: String, nullable: true, example: "1.5000" }) cashVariance!: string | null;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;

  static fromDomain(shift: PosShift): PosShiftResponseDto {
    const dto = new PosShiftResponseDto();
    dto.id = shift.id;
    dto.registerId = shift.registerId;
    dto.status = shift.status;
    dto.openedByUserId = shift.openedByUserId;
    dto.openedAt = shift.openedAt.toISOString();
    dto.openingCash = shift.openingCash;
    dto.closedByUserId = shift.closedByUserId;
    dto.closedAt = shift.closedAt ? shift.closedAt.toISOString() : null;
    dto.closingCashCounted = shift.closingCashCounted;
    dto.closingCashExpected = shift.closingCashExpected;
    dto.cashVariance = shift.cashVariance;
    dto.notes = shift.notes;
    return dto;
  }
}
