import { Inject, Injectable } from "@nestjs/common";
import { addDecimal, subtractDecimal } from "../../domain/decimal";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { JOURNAL_ENTRY_LINE_REPOSITORY, JournalEntryLineRepository } from "../../domain/journal-entry-line.repository";
import { AccountNotFoundError } from "../errors";

export interface AccountLedgerRow {
  journalEntryId: string;
  entryDate: Date;
  entryDescription: string;
  lineDescription: string | null;
  debit: string;
  credit: string;
  /** This account's own balance after this line, signed per its `normalBalance` side — a debit-normal account (ASSET/EXPENSE) increases on debit, a credit-normal one (LIABILITY/EQUITY/REVENUE) increases on credit. */
  runningBalance: string;
}

export interface AccountLedgerResult {
  accountId: string;
  accountCode: string;
  accountName: string;
  asOfDate: Date;
  rows: AccountLedgerRow[];
  endingBalance: string;
}

/**
 * Every posting that ever touched one account, in chronological order, with
 * a running balance recomputed fresh on every call — never a stored
 * counter that could drift from the underlying `JournalEntryLine` ledger
 * (the same philosophy `GetTrialBalanceUseCase`/`InventoryBalance` already
 * established). Reuses `JournalEntryRepository.listByCompanyUpTo` (its own
 * docstring already names this exact use case) to resolve each line's
 * `entryDate`/description and to exclude anything posted after `asOfDate`.
 */
@Injectable()
export class GetAccountLedgerUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY) private readonly journalEntryLines: JournalEntryLineRepository,
  ) {}

  async execute(tenantId: string, companyId: string, accountId: string, asOfDate: Date): Promise<AccountLedgerResult> {
    const account = await this.accounts.findById(tenantId, accountId);
    if (!account || account.companyId !== companyId) {
      throw new AccountNotFoundError();
    }

    const entries = await this.journalEntries.listByCompanyUpTo(tenantId, companyId, asOfDate);
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

    const allLines = await this.journalEntryLines.listByAccount(tenantId, accountId);
    const lines = allLines.filter((line) => entriesById.has(line.journalEntryId));

    lines.sort((a, b) => {
      const entryA = entriesById.get(a.journalEntryId)!;
      const entryB = entriesById.get(b.journalEntryId)!;
      const byDate = entryA.entryDate.getTime() - entryB.entryDate.getTime();
      if (byDate !== 0) return byDate;
      const byCreatedAt = entryA.createdAt.getTime() - entryB.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;
      return a.lineNumber - b.lineNumber;
    });

    const rows: AccountLedgerRow[] = [];
    let runningBalance = "0.0000";
    for (const line of lines) {
      const entry = entriesById.get(line.journalEntryId)!;
      runningBalance =
        account.normalBalance === "DEBIT"
          ? subtractDecimal(addDecimal(runningBalance, line.debit), line.credit)
          : subtractDecimal(addDecimal(runningBalance, line.credit), line.debit);
      rows.push({
        journalEntryId: entry.id,
        entryDate: entry.entryDate,
        entryDescription: entry.description,
        lineDescription: line.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance,
      });
    }

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      asOfDate,
      rows,
      endingBalance: runningBalance,
    };
  }
}
