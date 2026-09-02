import { Inject, Injectable } from "@nestjs/common";
import { JournalEntry } from "../../domain/journal-entry.entity";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { JournalEntryNotFoundError } from "../errors";

export interface GetJournalEntryInput {
  tenantId: string;
  companyId: string;
  id: string;
}

@Injectable()
export class GetJournalEntryUseCase {
  constructor(@Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository) {}

  async execute(input: GetJournalEntryInput): Promise<JournalEntry> {
    const entry = await this.journalEntries.findById(input.tenantId, input.id);
    if (!entry || entry.companyId !== input.companyId) {
      throw new JournalEntryNotFoundError();
    }
    return entry;
  }
}
