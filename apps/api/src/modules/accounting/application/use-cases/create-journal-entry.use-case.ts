import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { addDecimal, isEqualDecimal } from "../../domain/decimal";
import { JournalEntry } from "../../domain/journal-entry.entity";
import { JournalEntryLine } from "../../domain/journal-entry-line.entity";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { JOURNAL_ENTRY_REPOSITORY, JournalEntryRepository } from "../../domain/journal-entry.repository";
import { GetOpenFiscalPeriodForDateUseCase } from "./get-open-fiscal-period-for-date.use-case";
import {
  AccountNotActiveError,
  AccountNotFoundError,
  JournalEntryHasTooFewLinesError,
  JournalEntryIdempotencyConflictError,
  JournalEntryNotBalancedError,
} from "../errors";

export interface CreateJournalEntryLineInput {
  accountId: string;
  debit?: string;
  credit?: string;
  description?: string | null;
}

export interface CreateJournalEntryInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  entryDate: string;
  description: string;
  /** Both required together or omitted together — a manual entry has neither. See docs/DECISIONS.md ADR-012 for why no real caller sets these yet. */
  sourceType?: string | null;
  sourceId?: string | null;
  /** Set only by `ReverseJournalEntryUseCase`, to the original entry's id — the reversal's own backward pointer, so a reversing entry is traceable to what it reverses without parsing its description. */
  reversalOfEntryId?: string | null;
  lines: CreateJournalEntryLineInput[];
}

export interface CreateJournalEntryResult {
  entry: JournalEntry;
  lines: JournalEntryLine[];
  /** True when this call replayed an already-posted entry for the same (sourceType, sourceId) instead of creating a new one — the caller (audit trail) must not treat a replay as a fresh posting. */
  wasReplayed: boolean;
}

/**
 * The one and only way a `JournalEntry` is ever posted (MASTER_SPEC §32's
 * double-entry invariant, `docs/ROADMAP.md` §12's "Todo asiento balancea").
 * Every line's account is re-validated as real, company-owned, and ACTIVE;
 * the fiscal period is resolved fresh from `entryDate` and must be OPEN
 * (`docs/ROADMAP.md` §12: "los períodos cerrados están protegidos" — this
 * use case is the actual enforcement point, not just the domain's own
 * `FiscalPeriod.close()` guard). Idempotent by `(sourceType, sourceId)`
 * when both are supplied, mirroring `CapturePaymentUseCase`'s own
 * contract exactly: a pre-check for the common sequential-retry case, plus
 * a real `@@unique([tenantId, companyId, sourceType, sourceId])`
 * constraint and a translated-conflict re-fetch for a genuine concurrent
 * race (`docs/ROADMAP.md` §12: "Reprocesar source events no duplica
 * postings"). No real caller passes a source yet — see ADR-012 — so this
 * is verified with a simulated source key, the same "build and verify the
 * mechanism before any real consumer exists" precedent ADR-008's inbox
 * already established.
 */
@Injectable()
export class CreateJournalEntryUseCase {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntries: JournalEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    private readonly getOpenFiscalPeriodForDate: GetOpenFiscalPeriodForDateUseCase,
  ) {}

  async execute(input: CreateJournalEntryInput): Promise<CreateJournalEntryResult> {
    if (input.sourceType && input.sourceId) {
      const existing = await this.journalEntries.findBySource(input.tenantId, input.companyId, input.sourceType, input.sourceId);
      if (existing) {
        return { entry: existing, lines: [], wasReplayed: true };
      }
    }

    if (input.lines.length < 2) {
      throw new JournalEntryHasTooFewLinesError();
    }

    const entryDate = new Date(input.entryDate);
    const fiscalPeriod = await this.getOpenFiscalPeriodForDate.execute(input.tenantId, input.companyId, entryDate);

    const entryId = newId();
    const now = new Date();
    let totalDebit = "0.0000";
    let totalCredit = "0.0000";

    const lines: JournalEntryLine[] = [];
    let lineNumber = 1;
    for (const lineInput of input.lines) {
      const account = await this.accounts.findById(input.tenantId, lineInput.accountId);
      if (!account || account.companyId !== input.companyId) {
        throw new AccountNotFoundError();
      }
      if (account.status !== "ACTIVE") {
        throw new AccountNotActiveError(account.code);
      }

      const debit = lineInput.debit ?? "0";
      const credit = lineInput.credit ?? "0";
      const line = JournalEntryLine.create({
        id: newId(),
        tenantId: input.tenantId,
        journalEntryId: entryId,
        accountId: account.id,
        lineNumber: lineNumber++,
        debit,
        credit,
        description: lineInput.description?.trim() || null,
        createdAt: now,
      });
      lines.push(line);
      totalDebit = addDecimal(totalDebit, line.debit);
      totalCredit = addDecimal(totalCredit, line.credit);
    }

    if (!isEqualDecimal(totalDebit, totalCredit)) {
      throw new JournalEntryNotBalancedError();
    }

    const entry = JournalEntry.create({
      id: entryId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      fiscalPeriodId: fiscalPeriod.id,
      entryDate,
      description: input.description,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      reversalOfEntryId: input.reversalOfEntryId ?? null,
      reversedByEntryId: null,
      reversedAt: null,
      createdByUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: now,
    });

    try {
      await this.journalEntries.saveWithLines(entry, lines);
    } catch (error) {
      if (error instanceof JournalEntryIdempotencyConflictError && input.sourceType && input.sourceId) {
        const winner = await this.journalEntries.findBySource(input.tenantId, input.companyId, input.sourceType, input.sourceId);
        if (winner) {
          return { entry: winner, lines: [], wasReplayed: true };
        }
      }
      throw error;
    }

    return { entry, lines, wasReplayed: false };
  }
}
