import { JournalEntryLine } from "./journal-entry-line.entity";

/** Read-only — every line is created exclusively via `JournalEntryRepository.saveWithLines`, atomically with its parent entry. */
export interface JournalEntryLineRepository {
  listByJournalEntry(tenantId: string, journalEntryId: string): Promise<JournalEntryLine[]>;
  /** Every line ever posted to this account, across every entry — the raw material for `GetAccountLedgerUseCase`/`GetTrialBalanceUseCase`, always summed fresh, never a stored running balance (the same "ledger read, never a drifting counter" philosophy `InventoryBalance` already established). */
  listByAccount(tenantId: string, accountId: string): Promise<JournalEntryLine[]>;
  listByJournalEntryIds(tenantId: string, journalEntryIds: string[]): Promise<JournalEntryLine[]>;
}

export const JOURNAL_ENTRY_LINE_REPOSITORY = Symbol("JOURNAL_ENTRY_LINE_REPOSITORY");
