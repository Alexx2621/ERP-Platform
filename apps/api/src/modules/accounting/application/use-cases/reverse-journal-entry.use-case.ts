import { Inject, Injectable } from "@nestjs/common";
import { JournalEntry } from "../../domain/journal-entry.entity";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { JOURNAL_ENTRY_LINE_REPOSITORY, JournalEntryLineRepository } from "../../domain/journal-entry-line.repository";
import { CreateJournalEntryUseCase } from "./create-journal-entry.use-case";
import { JournalEntryAlreadyReversedError, JournalEntryNotFoundError } from "../errors";

export interface ReverseJournalEntryInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  journalEntryId: string;
  /** The reversal's own posting date — defaults to today. Deliberately independent of the original entry's own fiscal period: a mistake from a now-CLOSED period is corrected by posting the reversal into whatever period is OPEN *today*, the same real-world practice every accounting system supports (docs/ROADMAP.md §12: closed periods are protected from new postings, but that never means an old mistake can no longer be corrected — only that the correction lands in the current period, not the old one). */
  entryDate?: string;
  description?: string;
}

/**
 * A correction is always a brand-new, fully balanced entry with every
 * line's debit/credit swapped from the original — never an edit to the
 * original's own lines (MASTER_SPEC §32). `CreateJournalEntryUseCase`
 * itself re-validates every account is still ACTIVE and the target period
 * is still OPEN, so a reversal is held to exactly the same rules as any
 * other posting. **Known, accepted gap**: a genuinely concurrent
 * double-reversal of the same entry (two racing requests, both reading
 * `isReversed === false` before either commits) is not prevented by a
 * database constraint in this slice — unlike the public, anonymous
 * idempotency races Commerce/POS had to harden against, this is an
 * authenticated, staff-only action where the realistic failure mode is a
 * double-click, not adversarial concurrency; `markReversed()` on the
 * original does still reject a *second sequential* reversal attempt once
 * the first has actually committed.
 */
@Injectable()
export class ReverseJournalEntryUseCase {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY) private readonly journalEntryLines: JournalEntryLineRepository,
    private readonly createJournalEntry: CreateJournalEntryUseCase,
  ) {}

  async execute(input: ReverseJournalEntryInput): Promise<JournalEntry> {
    const original = await this.journalEntries.findById(input.tenantId, input.journalEntryId);
    if (!original || original.companyId !== input.companyId) {
      throw new JournalEntryNotFoundError();
    }
    if (original.isReversed) {
      throw new JournalEntryAlreadyReversedError();
    }

    const originalLines = await this.journalEntryLines.listByJournalEntry(input.tenantId, original.id);
    const entryDate = input.entryDate ?? new Date().toISOString().slice(0, 10);

    const { entry: reversal } = await this.createJournalEntry.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      entryDate,
      description: input.description?.trim() || `Reversal of: ${original.description}`,
      reversalOfEntryId: original.id,
      lines: originalLines.map((line) => ({
        accountId: line.accountId,
        // Swapped: what was a debit becomes a credit and vice versa —
        // exactly cancels the original's economic effect.
        debit: line.credit,
        credit: line.debit,
        description: line.description,
      })),
    });

    original.markReversed(reversal.id, new Date());
    await this.journalEntries.save(original);

    return reversal;
  }
}
