import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";
import type { TrialBalanceResult } from "../../application/use-cases/get-trial-balance.use-case";
import type { AccountLedgerResult } from "../../application/use-cases/get-account-ledger.use-case";

export class AsOfDateQueryDto {
  @ApiProperty({ example: "2026-01-31", description: "Defaults to today." })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}

export class AccountLedgerQueryDto extends AsOfDateQueryDto {
  @ApiProperty() @IsUUID() accountId!: string;
}

export class TrialBalanceRowResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ enum: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] }) accountType!: string;
  @ApiProperty({ example: "100.0000" }) totalDebit!: string;
  @ApiProperty({ example: "0.0000" }) totalCredit!: string;
  @ApiProperty({ example: "100.0000" }) netAmount!: string;
}

export class TrialBalanceResponseDto {
  @ApiProperty({ format: "date-time", type: String }) asOfDate!: string;
  @ApiProperty({ type: [TrialBalanceRowResponseDto] }) rows!: TrialBalanceRowResponseDto[];
  @ApiProperty({ example: "1000.0000" }) totalDebit!: string;
  @ApiProperty({ example: "1000.0000" }) totalCredit!: string;
  @ApiProperty() isBalanced!: boolean;

  static fromResult(result: TrialBalanceResult): TrialBalanceResponseDto {
    const dto = new TrialBalanceResponseDto();
    dto.asOfDate = result.asOfDate.toISOString();
    dto.rows = result.rows.map((row) => ({ ...row }));
    dto.totalDebit = result.totalDebit;
    dto.totalCredit = result.totalCredit;
    dto.isBalanced = result.isBalanced;
    return dto;
  }
}

export class AccountLedgerRowResponseDto {
  @ApiProperty() journalEntryId!: string;
  @ApiProperty({ format: "date-time", type: String }) entryDate!: string;
  @ApiProperty() entryDescription!: string;
  @ApiProperty({ type: String, nullable: true }) lineDescription!: string | null;
  @ApiProperty({ example: "100.0000" }) debit!: string;
  @ApiProperty({ example: "0.0000" }) credit!: string;
  @ApiProperty({ example: "100.0000" }) runningBalance!: string;
}

export class AccountLedgerResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ format: "date-time", type: String }) asOfDate!: string;
  @ApiProperty({ type: [AccountLedgerRowResponseDto] }) rows!: AccountLedgerRowResponseDto[];
  @ApiProperty({ example: "100.0000" }) endingBalance!: string;

  static fromResult(result: AccountLedgerResult): AccountLedgerResponseDto {
    const dto = new AccountLedgerResponseDto();
    dto.accountId = result.accountId;
    dto.accountCode = result.accountCode;
    dto.accountName = result.accountName;
    dto.asOfDate = result.asOfDate.toISOString();
    dto.rows = result.rows.map((row) => ({
      journalEntryId: row.journalEntryId,
      entryDate: row.entryDate.toISOString(),
      entryDescription: row.entryDescription,
      lineDescription: row.lineDescription,
      debit: row.debit,
      credit: row.credit,
      runningBalance: row.runningBalance,
    }));
    dto.endingBalance = result.endingBalance;
    return dto;
  }
}
