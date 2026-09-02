import { Inject, Injectable } from "@nestjs/common";
import { AccountType } from "../../domain/account.entity";
import { addDecimal, isEqualDecimal, subtractDecimal } from "../../domain/decimal";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { JOURNAL_ENTRY_LINE_REPOSITORY, JournalEntryLineRepository } from "../../domain/journal-entry-line.repository";

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: string;
  totalCredit: string;
  /** `totalDebit - totalCredit`, signed — positive means a net debit balance for this account as of this date. */
  netAmount: string;
}

export interface TrialBalanceResult {
  asOfDate: Date;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  /** Whether `totalDebit === totalCredit` across every row — the aggregate, ledger-derived confirmation of `docs/ROADMAP.md` §12's "todo asiento balancea", recomputed fresh every time this report runs, never a stored flag that could drift. */
  isBalanced: boolean;
}

/**
 * A real Trial Balance: every account with at least one posting up to
 * `asOfDate`, summed fresh from the raw `JournalEntryLine` ledger — never
 * a stored running balance (the same "ledger read, never a drifting
 * counter" philosophy `InventoryBalance`/`CloseShiftUseCase` already
 * established). Accounts with zero activity up to this date are omitted —
 * a proportionate choice for a report meant to be read, not a dump of
 * every unused line of a fresh Chart of Accounts.
 */
@Injectable()
export class GetTrialBalanceUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY) private readonly journalEntryLines: JournalEntryLineRepository,
  ) {}

  async execute(tenantId: string, companyId: string, asOfDate: Date): Promise<TrialBalanceResult> {
    const entries = await this.journalEntries.listByCompanyUpTo(tenantId, companyId, asOfDate);
    const lines = await this.journalEntryLines.listByJournalEntryIds(
      tenantId,
      entries.map((entry) => entry.id),
    );

    const totalsByAccountId = new Map<string, { debit: string; credit: string }>();
    for (const line of lines) {
      const current = totalsByAccountId.get(line.accountId) ?? { debit: "0.0000", credit: "0.0000" };
      totalsByAccountId.set(line.accountId, {
        debit: addDecimal(current.debit, line.debit),
        credit: addDecimal(current.credit, line.credit),
      });
    }

    const rows: TrialBalanceRow[] = [];
    let totalDebit = "0.0000";
    let totalCredit = "0.0000";
    for (const [accountId, totals] of totalsByAccountId) {
      const account = await this.accounts.findById(tenantId, accountId);
      if (!account) continue; // defensive — every account referenced by a real line must exist, but never let a report crash on a data anomaly
      rows.push({
        accountId,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        netAmount: subtractDecimal(totals.debit, totals.credit),
      });
      totalDebit = addDecimal(totalDebit, totals.debit);
      totalCredit = addDecimal(totalCredit, totals.credit);
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return { asOfDate, rows, totalDebit, totalCredit, isBalanced: isEqualDecimal(totalDebit, totalCredit) };
  }
}
