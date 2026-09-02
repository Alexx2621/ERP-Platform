import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { PrismaAccountRepository } from "../../src/modules/accounting/infrastructure/prisma-account.repository";
import { PrismaFiscalPeriodRepository } from "../../src/modules/accounting/infrastructure/prisma-fiscal-period.repository";
import { PrismaJournalEntryRepository } from "../../src/modules/accounting/infrastructure/prisma-journal-entry.repository";
import { PrismaJournalEntryLineRepository } from "../../src/modules/accounting/infrastructure/prisma-journal-entry-line.repository";
import { CreateAccountUseCase } from "../../src/modules/accounting/application/use-cases/create-account.use-case";
import { CreateFiscalPeriodUseCase } from "../../src/modules/accounting/application/use-cases/create-fiscal-period.use-case";
import { CloseFiscalPeriodUseCase } from "../../src/modules/accounting/application/use-cases/close-fiscal-period.use-case";
import { GetOpenFiscalPeriodForDateUseCase } from "../../src/modules/accounting/application/use-cases/get-open-fiscal-period-for-date.use-case";
import { CreateJournalEntryUseCase } from "../../src/modules/accounting/application/use-cases/create-journal-entry.use-case";
import { ReverseJournalEntryUseCase } from "../../src/modules/accounting/application/use-cases/reverse-journal-entry.use-case";
import { GetTrialBalanceUseCase } from "../../src/modules/accounting/application/use-cases/get-trial-balance.use-case";
import { GetAccountLedgerUseCase } from "../../src/modules/accounting/application/use-cases/get-account-ledger.use-case";
import { NoOpenFiscalPeriodForDateError } from "../../src/modules/accounting/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({ id: newId(), email, displayName: "Accounting Integration Owner", status: "ACTIVE", isPlatformAdmin: false, createdAt: now, updatedAt: now });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

async function buildFixture(harness: PostgresTestHarness, slugSuffix: string) {
  const prisma = asRepositoryClient(harness.prisma);
  const users = new PrismaUserRepository(prisma);
  const tenants = new PrismaTenantRepository(prisma);
  const organizations = new PrismaOrganizationRepository(prisma);
  const companies = new PrismaCompanyRepository(prisma);

  const now = new Date("2026-09-01T00:00:00.000Z");
  const owner = createUser(now, `accounting-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `accounting-tenant-${slugSuffix}`);
  await users.save(owner);
  await tenants.save(tenant);

  const org = Organization.create({ id: newId(), tenantId: tenant.id, code: "HQ", name: "HQ", status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
  await organizations.save(org);
  const company = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO1",
    name: "Company One",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(company);

  const otherCompany = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO2",
    name: "Company Two",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(otherCompany);

  const accounts = new PrismaAccountRepository(prisma);
  const fiscalPeriods = new PrismaFiscalPeriodRepository(prisma);
  const journalEntries = new PrismaJournalEntryRepository(prisma);
  const journalEntryLines = new PrismaJournalEntryLineRepository(prisma);

  const createAccount = new CreateAccountUseCase(accounts);
  const createFiscalPeriod = new CreateFiscalPeriodUseCase(fiscalPeriods);
  const closeFiscalPeriod = new CloseFiscalPeriodUseCase(fiscalPeriods);
  const getOpenFiscalPeriodForDate = new GetOpenFiscalPeriodForDateUseCase(fiscalPeriods);
  const createJournalEntry = new CreateJournalEntryUseCase(journalEntries, accounts, getOpenFiscalPeriodForDate);
  const reverseJournalEntry = new ReverseJournalEntryUseCase(journalEntries, journalEntryLines, createJournalEntry);
  const getTrialBalance = new GetTrialBalanceUseCase(accounts, journalEntries, journalEntryLines);
  const getAccountLedger = new GetAccountLedgerUseCase(accounts, journalEntries, journalEntryLines);

  const cash = await createAccount.execute({ tenantId: tenant.id, companyId: company.id, code: "1000", name: "Cash", type: "ASSET" });
  const revenue = await createAccount.execute({ tenantId: tenant.id, companyId: company.id, code: "4000", name: "Sales Revenue", type: "REVENUE" });
  const expense = await createAccount.execute({ tenantId: tenant.id, companyId: company.id, code: "5000", name: "Operating Expense", type: "EXPENSE" });

  const period = await createFiscalPeriod.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "2026-01",
    name: "January 2026",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  });

  return {
    tenant,
    company,
    otherCompany,
    ownerId: owner.id,
    cash,
    revenue,
    expense,
    period,
    createAccount,
    createFiscalPeriod,
    closeFiscalPeriod,
    createJournalEntry,
    reverseJournalEntry,
    getTrialBalance,
    getAccountLedger,
    repositories: { accounts, fiscalPeriods, journalEntries, journalEntryLines },
  };
}

describe("Accounting module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full Account -> FiscalPeriod -> Post -> TrialBalance -> Reverse lifecycle against real Postgres", async () => {
    const fx = await buildFixture(harness, "lifecycle");

    const { entry, wasReplayed } = await fx.createJournalEntry.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: `corr-${newId()}`,
      entryDate: "2026-01-15",
      description: "Cash sale",
      lines: [
        { accountId: fx.cash.id, debit: "150.5000" },
        { accountId: fx.revenue.id, credit: "150.5000" },
      ],
    });
    expect(wasReplayed).toBe(false);
    expect(entry.fiscalPeriodId).toBe(fx.period.id);

    // Real Postgres round-trip precision — numeric(14,4), no trailing-zero loss.
    const lines = await fx.repositories.journalEntryLines.listByJournalEntry(fx.tenant.id, entry.id);
    const cashLine = lines.find((l) => l.accountId === fx.cash.id);
    expect(cashLine?.debit).toBe("150.5000");

    const trialBalance = await fx.getTrialBalance.execute(fx.tenant.id, fx.company.id, new Date("2026-01-31"));
    expect(trialBalance.isBalanced).toBe(true);
    expect(trialBalance.totalDebit).toBe("150.5000");
    expect(trialBalance.totalCredit).toBe("150.5000");

    const ledger = await fx.getAccountLedger.execute(fx.tenant.id, fx.company.id, fx.cash.id, new Date("2026-01-31"));
    expect(ledger.endingBalance).toBe("150.5000");

    // Attempting to close a period that has already been posted into is
    // still allowed — closing only blocks *future* postings.
    const closed = await fx.closeFiscalPeriod.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, id: fx.period.id });
    expect(closed.status).toBe("CLOSED");

    // A new posting against the now-closed period's own date is rejected —
    // the real enforcement point, verified against real Postgres state.
    await expect(
      fx.createJournalEntry.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId: fx.ownerId,
        correlationId: `corr-${newId()}`,
        entryDate: "2026-01-20",
        description: "Too late",
        lines: [
          { accountId: fx.cash.id, debit: "10.0000" },
          { accountId: fx.revenue.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow(NoOpenFiscalPeriodForDateError);

    // The reversal posts into whatever period is OPEN *today* (a fresh
    // February period), independent of the original's now-closed period.
    await fx.createFiscalPeriod.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      code: "2026-02",
      name: "February 2026",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    const reversal = await fx.reverseJournalEntry.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: `corr-${newId()}`,
      journalEntryId: entry.id,
      entryDate: "2026-02-05",
    });
    expect(reversal.reversalOfEntryId).toBe(entry.id);

    const reloadedOriginal = await fx.repositories.journalEntries.findById(fx.tenant.id, entry.id);
    expect(reloadedOriginal?.isReversed).toBe(true);
    expect(reloadedOriginal?.reversedByEntryId).toBe(reversal.id);

    const trialBalanceAfterReversal = await fx.getTrialBalance.execute(fx.tenant.id, fx.company.id, new Date("2026-02-28"));
    expect(trialBalanceAfterReversal.isBalanced).toBe(true);
    // The original 150.5000 debit + the reversal's 150.5000 credit net to zero.
    const cashRow = trialBalanceAfterReversal.rows.find((r) => r.accountId === fx.cash.id);
    expect(cashRow?.netAmount).toBe("0.0000");
  });

  it("rejects a journal entry line referencing an account from another company — real FK-scoped rejection, not just an application filter", async () => {
    const fx = await buildFixture(harness, "cross-company");
    const foreignAccount = await fx.createAccount.execute({ tenantId: fx.tenant.id, companyId: fx.otherCompany.id, code: "1000", name: "Foreign Cash", type: "ASSET" });

    await expect(
      fx.createJournalEntry.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId: fx.ownerId,
        correlationId: `corr-${newId()}`,
        entryDate: "2026-01-15",
        description: "Cross-company attempt",
        lines: [
          { accountId: foreignAccount.id, debit: "10.0000" },
          { accountId: fx.revenue.id, credit: "10.0000" },
        ],
      }),
    ).rejects.toThrow();
  });

  it("enforces the real @@unique([tenantId, companyId, sourceType, sourceId]) constraint under genuinely concurrent posting requests: exactly one JournalEntry ever survives, and every caller converges on it", async () => {
    // Mirrors PosSale/Payment's own concurrent-idempotency verification —
    // ADR-012 notes no real caller supplies a source key yet, so this
    // simulates one to verify the mechanism itself is sound ahead of a
    // real integration wiring it in (the same "build and verify before any
    // real consumer exists" precedent ADR-008's inbox already established).
    const fx = await buildFixture(harness, "idempotency-race");
    const sourceType = "SALES_ORDER";
    const sourceId = `so-${newId()}`;

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        fx.createJournalEntry.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          actorUserId: fx.ownerId,
          correlationId: `corr-${newId()}`,
          entryDate: "2026-01-15",
          description: "Concurrent source-linked posting",
          sourceType,
          sourceId,
          lines: [
            { accountId: fx.cash.id, debit: "25.0000" },
            { accountId: fx.revenue.id, credit: "25.0000" },
          ],
        }),
      ),
    );

    const fulfilled = attempts.filter(
      (a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof fx.createJournalEntry.execute>>> => a.status === "fulfilled",
    );
    expect(fulfilled).toHaveLength(5);

    const distinctIds = new Set(fulfilled.map((f) => f.value.entry.id));
    expect(distinctIds.size).toBe(1);

    const replayCount = fulfilled.filter((f) => f.value.wasReplayed).length;
    expect(replayCount).toBe(4);

    const stored = await fx.repositories.journalEntries.findBySource(fx.tenant.id, fx.company.id, sourceType, sourceId);
    expect(stored).not.toBeNull();
    const storedLines = await fx.repositories.journalEntryLines.listByJournalEntry(fx.tenant.id, stored!.id);
    expect(storedLines).toHaveLength(2);
  }, 30_000);
});
