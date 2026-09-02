import { buildAccountingTestContext } from "../../test-support/build-accounting-test-context";

describe("GetTrialBalanceUseCase", () => {
  it("sums debits/credits per account and confirms the aggregate balances", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-10",
      description: "Cash sale",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-20",
      description: "Pay expense",
      lines: [
        { accountId: ctx.expense.id, debit: "30.0000" },
        { accountId: ctx.cash.id, credit: "30.0000" },
      ],
    });

    const trialBalance = await ctx.getTrialBalance.execute(ctx.tenantId, ctx.companyId, new Date("2026-01-31"));
    expect(trialBalance.isBalanced).toBe(true);
    expect(trialBalance.totalDebit).toBe(trialBalance.totalCredit);

    const cashRow = trialBalance.rows.find((r) => r.accountId === ctx.cash.id);
    expect(cashRow?.totalDebit).toBe("100.0000");
    expect(cashRow?.totalCredit).toBe("30.0000");
    expect(cashRow?.netAmount).toBe("70.0000");
  });

  it("excludes postings after asOfDate", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-20",
      description: "Late in the month",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });

    const early = await ctx.getTrialBalance.execute(ctx.tenantId, ctx.companyId, new Date("2026-01-10"));
    expect(early.rows).toHaveLength(0);
    expect(early.isBalanced).toBe(true);
  });

  it("omits accounts with zero activity up to the date", async () => {
    const ctx = await buildAccountingTestContext();
    const trialBalance = await ctx.getTrialBalance.execute(ctx.tenantId, ctx.companyId, new Date("2026-01-31"));
    expect(trialBalance.rows.some((r) => r.accountId === ctx.expense.id)).toBe(false);
  });
});

describe("GetAccountLedgerUseCase", () => {
  it("computes a running balance that increases on the account's normal-balance side", async () => {
    const ctx = await buildAccountingTestContext();
    // Cash (ASSET, normalBalance DEBIT): +100 debit, then -30 credit -> running 100, then 70.
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-10",
      description: "Cash in",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-20",
      description: "Cash out",
      lines: [
        { accountId: ctx.expense.id, debit: "30.0000" },
        { accountId: ctx.cash.id, credit: "30.0000" },
      ],
    });

    const ledger = await ctx.getAccountLedger.execute(ctx.tenantId, ctx.companyId, ctx.cash.id, new Date("2026-01-31"));
    expect(ledger.rows).toHaveLength(2);
    expect(ledger.rows[0]?.runningBalance).toBe("100.0000");
    expect(ledger.rows[1]?.runningBalance).toBe("70.0000");
    expect(ledger.endingBalance).toBe("70.0000");
  });

  it("computes a running balance for a credit-normal account (REVENUE) increasing on credit", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.createJournalEntry.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      entryDate: "2026-01-10",
      description: "Cash sale",
      lines: [
        { accountId: ctx.cash.id, debit: "100.0000" },
        { accountId: ctx.revenue.id, credit: "100.0000" },
      ],
    });
    const ledger = await ctx.getAccountLedger.execute(ctx.tenantId, ctx.companyId, ctx.revenue.id, new Date("2026-01-31"));
    expect(ledger.rows[0]?.runningBalance).toBe("100.0000");
  });

  it("returns an empty ledger with a zero ending balance for an untouched account", async () => {
    const ctx = await buildAccountingTestContext();
    const ledger = await ctx.getAccountLedger.execute(ctx.tenantId, ctx.companyId, ctx.expense.id, new Date("2026-01-31"));
    expect(ledger.rows).toHaveLength(0);
    expect(ledger.endingBalance).toBe("0.0000");
  });
});
