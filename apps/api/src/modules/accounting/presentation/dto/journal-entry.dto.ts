import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import type { JournalEntry } from "../../domain/journal-entry.entity";
import type { JournalEntryLine } from "../../domain/journal-entry-line.entity";

const NON_NEGATIVE_DECIMAL = /^\d+(\.\d{1,4})?$/;

export class CreateJournalEntryLineDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiPropertyOptional({ example: "100.0000", description: "Exactly one of debit/credit must be positive; the other must be omitted or zero." })
  @IsOptional()
  @Matches(NON_NEGATIVE_DECIMAL, { message: "debit must be a non-negative decimal string with up to 4 fraction digits." })
  debit?: string;
  @ApiPropertyOptional({ example: "100.0000" })
  @IsOptional()
  @Matches(NON_NEGATIVE_DECIMAL, { message: "credit must be a non-negative decimal string with up to 4 fraction digits." })
  credit?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(300) description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: "2026-01-15" }) @IsDateString() entryDate!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) description!: string;
  @ApiProperty({ type: [CreateJournalEntryLineDto], minItems: 2 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines!: CreateJournalEntryLineDto[];
}

export class ReverseJournalEntryDto {
  @ApiPropertyOptional({ example: "2026-02-01", description: "Defaults to today — deliberately independent of the original entry's own fiscal period." })
  @IsOptional()
  @IsDateString()
  entryDate?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class ListJournalEntriesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fiscalPeriodId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class JournalEntryLineResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() journalEntryId!: string;
  @ApiProperty() accountId!: string;
  @ApiProperty() lineNumber!: number;
  @ApiProperty({ example: "100.0000" }) debit!: string;
  @ApiProperty({ example: "0.0000" }) credit!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(line: JournalEntryLine): JournalEntryLineResponseDto {
    const dto = new JournalEntryLineResponseDto();
    dto.id = line.id;
    dto.journalEntryId = line.journalEntryId;
    dto.accountId = line.accountId;
    dto.lineNumber = line.lineNumber;
    dto.debit = line.debit;
    dto.credit = line.credit;
    dto.description = line.description;
    dto.createdAt = line.createdAt.toISOString();
    return dto;
  }
}

export class JournalEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fiscalPeriodId!: string;
  @ApiProperty({ format: "date-time", type: String }) entryDate!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, nullable: true }) sourceType!: string | null;
  @ApiProperty({ type: String, nullable: true }) sourceId!: string | null;
  @ApiProperty({ type: String, nullable: true }) reversalOfEntryId!: string | null;
  @ApiProperty({ type: String, nullable: true }) reversedByEntryId!: string | null;
  @ApiProperty({ format: "date-time", type: String, nullable: true }) reversedAt!: string | null;
  @ApiProperty() createdByUserId!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;

  static fromDomain(entry: JournalEntry): JournalEntryResponseDto {
    const dto = new JournalEntryResponseDto();
    dto.id = entry.id;
    dto.fiscalPeriodId = entry.fiscalPeriodId;
    dto.entryDate = entry.entryDate.toISOString();
    dto.description = entry.description;
    dto.sourceType = entry.sourceType;
    dto.sourceId = entry.sourceId;
    dto.reversalOfEntryId = entry.reversalOfEntryId;
    dto.reversedByEntryId = entry.reversedByEntryId;
    dto.reversedAt = entry.reversedAt ? entry.reversedAt.toISOString() : null;
    dto.createdByUserId = entry.createdByUserId;
    dto.createdAt = entry.createdAt.toISOString();
    return dto;
  }
}
