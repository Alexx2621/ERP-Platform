import { JournalEntryLine } from "../domain/journal-entry-line.entity";
import { JournalEntryLineRepository } from "../domain/journal-entry-line.repository";
import { InMemoryJournalEntryRepository } from "./in-memory-journal-entry.repository";

export class InMemoryJournalEntryLineRepository implements JournalEntryLineRepository {
  constructor(private readonly journalEntries: InMemoryJournalEntryRepository) {}

  async listByJournalEntry(tenantId: string, journalEntryId: string): Promise<JournalEntryLine[]> {
    return this.journalEntries.getLinesForEntry(journalEntryId).filter((line) => line.tenantId === tenantId);
  }

  async listByAccount(tenantId: string, accountId: string): Promise<JournalEntryLine[]> {
    return this.journalEntries.getAllLines().filter((line) => line.tenantId === tenantId && line.accountId === accountId);
  }

  async listByJournalEntryIds(tenantId: string, journalEntryIds: string[]): Promise<JournalEntryLine[]> {
    const idSet = new Set(journalEntryIds);
    return this.journalEntries.getAllLines().filter((line) => line.tenantId === tenantId && idSet.has(line.journalEntryId));
  }
}
