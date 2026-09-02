import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type { Account } from "../../domain/account.entity";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

export class CreateAccountDto {
  @ApiProperty({ example: "1000" }) @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @ApiProperty({ example: "Cash" }) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ enum: ACCOUNT_TYPES }) @IsIn(ACCOUNT_TYPES) type!: (typeof ACCOUNT_TYPES)[number];
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsUUID() parentAccountId?: string;
}

export class UpdateAccountDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
}

export class SetAccountStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class ListAccountsQueryDto {
  @ApiPropertyOptional({ enum: ACCOUNT_TYPES }) @IsOptional() @IsIn(ACCOUNT_TYPES) type?: (typeof ACCOUNT_TYPES)[number];
  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] }) @IsOptional() @IsIn(["ACTIVE", "INACTIVE"]) status?: "ACTIVE" | "INACTIVE";
}

export class AccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) parentAccountId!: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ACCOUNT_TYPES }) type!: string;
  @ApiProperty({ enum: ["DEBIT", "CREDIT"] }) normalBalance!: string;
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] }) status!: string;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: string;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: string;

  static fromDomain(account: Account): AccountResponseDto {
    const dto = new AccountResponseDto();
    dto.id = account.id;
    dto.parentAccountId = account.parentAccountId;
    dto.code = account.code;
    dto.name = account.name;
    dto.type = account.type;
    dto.normalBalance = account.normalBalance;
    dto.status = account.status;
    dto.createdAt = account.createdAt.toISOString();
    dto.updatedAt = account.updatedAt.toISOString();
    return dto;
  }
}
