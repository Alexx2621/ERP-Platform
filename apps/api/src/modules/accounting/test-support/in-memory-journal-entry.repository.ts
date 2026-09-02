import { JournalEntry } from "../domain/journal-entry.entity";
import { JournalEntryLine } from "../domain/journal-entry-line.entity";
import { JournalEntryRepository, ListJournalEntriesFilter } from "../domain/journal-entry.repository";
import { JournalEntryIdempotencyConflictError } from "../application/errors";

/**
 * Also the storage backing `InMemoryJournalEntryLineRepository` (constructed
 * with this instance) — a fake `JournalEntryLineRepository` has nowhere else
 * to read from, since the real interface is read-only and every line is
 * written exclusively through `saveWithLines` here. Mirrors the same
 * "one in-memory fake derives from another's stored data" precedent already
 * used by `InMemoryInventoryBalanceRepository(movements)`.
 */
export class InMemoryJournalEntryRepository implements JournalEntryRepository {
  private readonly byId = new Map<string, JournalEntry>();
  private readonly linesByEntryId = new Map<string, JournalEntryLine[]>();

  async findById(tenantId: string, id: string): Promise<JournalEntry | null> {
    const entry = this.byId.get(id);
    return entry && entry.tenantId === tenantId ? entry : null;
  }

  async findBySource(tenantId: string, companyId: string, sourceType: string, sourceId: string): Promise<JournalEntry | null> {
    return (
      [...this.byId.values()].find(
        (e) => e.tenantId === tenantId && e.companyId === companyId && e.sourceType === sourceType && e.sourceId === sourceId,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListJournalEntriesFilter): Promise<JournalEntry[]> {
    return [...this.byId.values()]
      .filter((e) => e.tenantId === tenantId && e.companyId === companyId && (filter.fiscalPeriodId === undefined || e.fiscalPeriodId === filter.fiscalPeriodId))
      .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime())
      .slice(0, filter.limit);
  }

  async listByCompanyUpTo(tenantId: string, companyId: string, asOfDate: Date): Promise<JournalEntry[]> {
    return [...this.byId.values()]
      .filter((e) => e.tenantId === tenantId && e.companyId === companyId && e.entryDate.getTime() <= asOfDate.getTime())
      .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  }

  async saveWithLines(entry: JournalEntry, lines: JournalEntryLine[]): Promise<void> {
    if (entry.sourceType && entry.sourceId) {
      const duplicate = await this.findBySource(entry.tenantId, entry.companyId, entry.sourceType, entry.sourceId);
      if (duplicate && duplicate.id !== entry.id) {
        throw new JournalEntryIdempotencyConflictError();
      }
    }
    this.byId.set(entry.id, entry);
    this.linesByEntryId.set(entry.id, lines);
  }

  async save(entry: JournalEntry): Promise<void> {
    this.byId.set(entry.id, entry);
  }

  getLinesForEntry(journalEntryId: string): JournalEntryLine[] {
    return this.linesByEntryId.get(journalEntryId) ?? [];
  }

  getAllLines(): JournalEntryLine[] {
    return [...this.linesByEntryId.values()].flat();
  }
}
