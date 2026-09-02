import { Inject, Injectable } from "@nestjs/common";
import { JournalEntry } from "../../domain/journal-entry.entity";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository, ListJournalEntriesFilter } from "../../domain/journal-entry.repository";

export interface ListJournalEntriesInput {
  tenantId: string;
  companyId: string;
  filter: ListJournalEntriesFilter;
}

@Injectable()
export class ListJournalEntriesUseCase {
  constructor(@Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository) {}

  async execute(input: ListJournalEntriesInput): Promise<JournalEntry[]> {
    return this.journalEntries.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
