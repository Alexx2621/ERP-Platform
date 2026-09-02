import { buildAccountingTestContext } from "../../test-support/build-accounting-test-context";
import {
  AccountNotActiveError,
  AccountNotFoundError,
  JournalEntryAlreadyReversedError,
  JournalEntryHasTooFewLinesError,
  JournalEntryNotBalancedError,
  JournalEntryNotFoundError,
  NoOpenFiscalPeriodForDateError,
} from "../errors";

describe("CreateJournalEntryUseCase", () => {
  it("posts a balanced entry with a real fiscal period resolved from entryDate", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry, lines, wasReplayed } = await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Cash sale",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
    expect(wasReplayed).toBe(false);
    expect(entry.fiscalPeriodId).toBe(ctx.openPeriod.id);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.lineNumber).toBe(1);
    expect(lines[1]?.lineNumber).toBe(2);
  });

  it("rejects an entry with fewer than two lines", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-01-15",
        description: "One line only",
        lines: [{ accountId: ctx.cash.id, debit: "100.0000" }],
      }),
    ).rejects.toThrow(JournalEntryHasTooFewLinesError);
  });

  it("rejects an entry whose total debits and credits do not match", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-01-15",
        description: "Unbalanced",
        lines: [
          { accountId: ctx.cash.id, debit: "100.0000" },
          { accountId: ctx.revenue.id, credit: "99.0000" },
        ],
      }),
    ).rejects.toThrow(JournalEntryNotBalancedError);
  });

  it("accepts a balanced multi-line entry (more than two lines)", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry } = await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Split payment",
      lines: [
        { accountId: ctx.cash.id, debit: "60.0000" },
        { accountId: ctx.accountsReceivable.id, debit: "40.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
    expect(entry.id).toBeTruthy();
  });

  it("rejects a line referencing an account from another company", async () => {
    const ctx = await buildAccountingTestContext();
    const otherAccount = await ctx.createAccount.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.otherCompanyId,
      code: "1000",
      name: "Foreign Cash",
      type: "ASSET",
    });
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-01-15",
        description: "Cross-company",
        lines: [
          { accountId: otherAccount.id, debit: "10.0000" },
          { accountId: ctx.revenue.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it("rejects a line referencing an INACTIVE account", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.setAccountStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.expense.id, status: "INACTIVE" });
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-01-15",
        description: "Against an inactive account",
        lines: [
          { accountId: ctx.expense.id, debit: "10.0000" },
          { accountId: ctx.cash.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow(AccountNotActiveError);
  });

  it("rejects an entryDate outside any OPEN fiscal period", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-06-01",
        description: "No period covers this date",
        lines: [
          { accountId: ctx.cash.id, debit: "10.0000" },
          { accountId: ctx.revenue.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow(NoOpenFiscalPeriodForDateError);
  });

  it("rejects any new posting once its fiscal period is CLOSED", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.closeFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.openPeriod.id });
    await expect(
      ctx.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        entryDate: "2026-01-15",
        description: "Against a closed period",
        lines: [
          { accountId: ctx.cash.id, debit: "10.0000" },
          { accountId: ctx.revenue.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow(NoOpenFiscalPeriodForDateError);
  });

  it("is idempotent by (sourceType, sourceId) — a repeated call replays the original instead of posting twice", async () => {
    const ctx = await buildAccountingTestContext();
    const input = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Sales order SO-1 posting",
      sourceType: "SALES_ORDER",
      sourceId: "so-1",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    };
    const first = await ctx.createJournalEntry.execute(input);
    const second = await ctx.createJournalEntry.execute(input);
    expect(first.wasReplayed).toBe(false);
    expect(second.wasReplayed).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);

    const allForPeriod = await ctx.listJournalEntries.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 100 } });
    expect(allForPeriod.filter((e) => e.sourceType === "SALES_ORDER" && e.sourceId === "so-1")).toHaveLength(1);
  });

  it("manual entries with no source never collide with each other", async () => {
    const ctx = await buildAccountingTestContext();
    const lines = [
      { accountId: ctx.cash.id, debit: "10.0000" },
      { accountId: ctx.revenue.id, credit: "10.0000" },
    ];
    const a = await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Manual entry A",
      lines,
    });
    const b = await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Manual entry B",
      lines,
    });
    expect(a.entry.id).not.toBe(b.entry.id);
    expect(a.wasReplayed).toBe(false);
    expect(b.wasReplayed).toBe(false);
  });
});

describe("ReverseJournalEntryUseCase", () => {
  async function postSample(ctx: Awaited<ReturnType<typeof buildAccountingTestContext>>) {
    return ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-15",
      description: "Cash sale",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
  }

  it("posts a new balanced entry with every line's debit/credit swapped", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original } = await postSample(ctx);

    const reversal = await ctx.reverseJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      journalEntryId: original.id,
      entryDate: "2026-01-20",
    });

    expect(reversal.id).not.toBe(original.id);
    expect(reversal.reversalOfEntryId).toBe(original.id);

    const reversalLines = await ctx.listJournalEntryLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, journalEntryId: reversal.id });
    const cashLine = reversalLines.find((l) => l.accountId === ctx.cash.id);
    const revenueLine = reversalLines.find((l) => l.accountId === ctx.revenue.id);
    expect(cashLine?.debit).toBe("0");
    expect(cashLine?.credit).toBe("100.0000");
    expect(revenueLine?.debit).toBe("100.0000");
    expect(revenueLine?.credit).toBe("0");
  });

  it("marks the original as reversed, pointing at the reversal", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original } = await postSample(ctx);
    const reversal = await ctx.reverseJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      journalEntryId: original.id,
      entryDate: "2026-01-20",
    });
    const reloaded = await ctx.getJournalEntry.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: original.id });
    expect(reloaded.isReversed).toBe(true);
    expect(reloaded.reversedByEntryId).toBe(reversal.id);
  });

  it("never edits the original entry's own lines", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original, lines: originalLines } = await postSample(ctx);
    await ctx.reverseJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      journalEntryId: original.id,
      entryDate: "2026-01-20",
    });
    const stillOriginalLines = await ctx.listJournalEntryLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, journalEntryId: original.id });
    expect(stillOriginalLines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit }))).toEqual(
      originalLines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })),
    );
  });

  it("rejects reversing an already-reversed entry", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original } = await postSample(ctx);
    await ctx.reverseJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      journalEntryId: original.id,
      entryDate: "2026-01-20",
    });
    await expect(
      ctx.reverseJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        journalEntryId: original.id,
      }),
    ).rejects.toThrow(JournalEntryAlreadyReversedError);
  });

  it("rejects reversing an entry from another company", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original } = await postSample(ctx);
    await expect(
      ctx.reverseJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.otherCompanyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        journalEntryId: original.id,
      }),
    ).rejects.toThrow(JournalEntryNotFoundError);
  });

  it("posts the reversal into whatever period is OPEN today, independent of the original's own period", async () => {
    const ctx = await buildAccountingTestContext();
    const { entry: original } = await postSample(ctx);
    await ctx.closeFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.openPeriod.id });
    const february = await ctx.createFiscalPeriod.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      code: "2026-02",
      name: "February 2026",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    const reversal = await ctx.reverseJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      journalEntryId: original.id,
      entryDate: "2026-02-05",
    });
    expect(reversal.fiscalPeriodId).toBe(february.id);
  });
});
