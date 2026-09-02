import { JournalEntry } from "./journal-entry.entity";
import { JournalEntryLine } from "./journal-entry-line.entity";

export interface ListJournalEntriesFilter {
  fiscalPeriodId?: string;
  limit: number;
}

export interface JournalEntryRepository {
  findById(tenantId: string, id: string): Promise<JournalEntry | null>;
  /** The idempotency lookup `CreateJournalEntryUseCase` pre-checks when a caller supplies `sourceType`/`sourceId` — see docs/DECISIONS.md ADR-012. */
  findBySource(tenantId: string, companyId: string, sourceType: string, sourceId: string): Promise<JournalEntry | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListJournalEntriesFilter): Promise<JournalEntry[]>;
  /** All entries whose entryDate falls on or before `asOfDate`, for the Trial Balance / Account Ledger reports. */
  listByCompanyUpTo(tenantId: string, companyId: string, asOfDate: Date): Promise<JournalEntry[]>;
  /**
   * The only way a `JournalEntry` is ever created — atomically, with all of
   * its lines, in a single transaction (a partially-saved unbalanced entry
   * would be a real integrity violation, not just a display glitch). May
   * throw `JournalEntryIdempotencyConflictError` if a concurrent request
   * already won the same `(sourceType, sourceId)` race.
   */
  saveWithLines(entry: JournalEntry, lines: JournalEntryLine[]): Promise<void>;
  /** Update-only — used solely by `ReverseJournalEntryUseCase` to set `reversedByEntryId`/`reversedAt` on the original entry after its reversal has been created. Never touches lines. */
  save(entry: JournalEntry): Promise<void>;
}

export const JOURNAL_ENTRY_REPOSITORY = Symbol("JOURNAL_ENTRY_REPOSITORY");
