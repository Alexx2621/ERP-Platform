import { Inject, Injectable } from "@nestjs/common";
import { JournalEntryLine } from "../../domain/journal-entry-line.entity";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { JOURNAL_ENTRY_LINE_REPOSITORY, JournalEntryLineRepository } from "../../domain/journal-entry-line.repository";
import { JournalEntryNotFoundError } from "../errors";

export interface ListJournalEntryLinesInput {
  tenantId: string;
  companyId: string;
  journalEntryId: string;
}

@Injectable()
export class ListJournalEntryLinesUseCase {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY) private readonly journalEntryLines: JournalEntryLineRepository,
  ) {}

  async execute(input: ListJournalEntryLinesInput): Promise<JournalEntryLine[]> {
    const entry = await this.journalEntries.findById(input.tenantId, input.journalEntryId);
    if (!entry || entry.companyId !== input.companyId) {
      throw new JournalEntryNotFoundError();
    }
    return this.journalEntryLines.listByJournalEntry(input.tenantId, entry.id);
  }
}
