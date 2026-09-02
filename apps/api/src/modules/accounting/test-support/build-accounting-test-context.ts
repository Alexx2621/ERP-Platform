import { InMemoryAccountRepository } from "./in-memory-account.repository";
import { InMemoryFiscalPeriodRepository } from "./in-memory-fiscal-period.repository";
import { InMemoryJournalEntryRepository } from "./in-memory-journal-entry.repository";
import { InMemoryJournalEntryLineRepository } from "./in-memory-journal-entry-line.repository";
import { CreateAccountUseCase } from "../application/use-cases/create-account.use-case";
import { UpdateAccountUseCase } from "../application/use-cases/update-account.use-case";
import { SetAccountStatusUseCase } from "../application/use-cases/set-account-status.use-case";
import { ListAccountsUseCase } from "../application/use-cases/list-accounts.use-case";
import { GetAccountUseCase } from "../application/use-cases/get-account.use-case";
import { CreateFiscalPeriodUseCase } from "../application/use-cases/create-fiscal-period.use-case";
import { CloseFiscalPeriodUseCase } from "../application/use-cases/close-fiscal-period.use-case";
import { ListFiscalPeriodsUseCase } from "../application/use-cases/list-fiscal-periods.use-case";
import { GetOpenFiscalPeriodForDateUseCase } from "../application/use-cases/get-open-fiscal-period-for-date.use-case";
import { CreateJournalEntryUseCase } from "../application/use-cases/create-journal-entry.use-case";
import { ReverseJournalEntryUseCase } from "../application/use-cases/reverse-journal-entry.use-case";
import { ListJournalEntriesUseCase } from "../application/use-cases/list-journal-entries.use-case";
import { GetJournalEntryUseCase } from "../application/use-cases/get-journal-entry.use-case";
import { ListJournalEntryLinesUseCase } from "../application/use-cases/list-journal-entry-lines.use-case";
import { GetTrialBalanceUseCase } from "../application/use-cases/get-trial-balance.use-case";
import { GetAccountLedgerUseCase } from "../application/use-cases/get-account-ledger.use-case";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";
export const ACTOR_USER_ID = "user-1";
export const CORRELATION_ID = "correlation-1";

/**
 * Shared fixture builder for Accounting application-layer tests, mirroring
 * the project's established `buildSalesTestContext()` pattern — except
 * Accounting has zero cross-module dependencies (docs/DECISIONS.md
 * ADR-012: no real caller posts to it yet), so every repository and use
 * case here is wired entirely within this one module.
 */
export async function buildAccountingTestContext() {
  const accounts = new InMemoryAccountRepository();
  const fiscalPeriods = new InMemoryFiscalPeriodRepository();
  const journalEntries = new InMemoryJournalEntryRepository();
  const journalEntryLines = new InMemoryJournalEntryLineRepository(journalEntries);

  const createAccount = new CreateAccountUseCase(accounts);
  const updateAccount = new UpdateAccountUseCase(accounts);
  const setAccountStatus = new SetAccountStatusUseCase(accounts);
  const listAccounts = new ListAccountsUseCase(accounts);
  const getAccount = new GetAccountUseCase(accounts);

  const createFiscalPeriod = new CreateFiscalPeriodUseCase(fiscalPeriods);
  const closeFiscalPeriod = new CloseFiscalPeriodUseCase(fiscalPeriods);
  const listFiscalPeriods = new ListFiscalPeriodsUseCase(fiscalPeriods);
  const getOpenFiscalPeriodForDate = new GetOpenFiscalPeriodForDateUseCase(fiscalPeriods);

  const createJournalEntry = new CreateJournalEntryUseCase(journalEntries, accounts, getOpenFiscalPeriodForDate);
  const reverseJournalEntry = new ReverseJournalEntryUseCase(journalEntries, journalEntryLines, createJournalEntry);
  const listJournalEntries = new ListJournalEntriesUseCase(journalEntries);
  const getJournalEntry = new GetJournalEntryUseCase(journalEntries);
  const listJournalEntryLines = new ListJournalEntryLinesUseCase(journalEntries, journalEntryLines);
  const getTrialBalance = new GetTrialBalanceUseCase(accounts, journalEntries, journalEntryLines);
  const getAccountLedger = new GetAccountLedgerUseCase(accounts, journalEntries, journalEntryLines);

  // A minimal, real starter Chart of Accounts — enough for tests to post
  // genuinely balanced entries without every test re-deriving its own.
  const cash = await createAccount.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "1000", name: "Cash", type: "ASSET" });
  const accountsReceivable = await createAccount.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "1100",
    name: "Accounts Receivable",
    type: "ASSET",
  });
  const accountsPayable = await createAccount.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "2000",
    name: "Accounts Payable",
    type: "LIABILITY",
  });
  const revenue = await createAccount.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "4000", name: "Sales Revenue", type: "REVENUE" });
  const expense = await createAccount.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "5000", name: "Operating Expense", type: "EXPENSE" });

  const openPeriod = await createFiscalPeriod.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "2026-01",
    name: "January 2026",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  });

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    actorUserId: ACTOR_USER_ID,
    correlationId: CORRELATION_ID,
    accounts,
    fiscalPeriods,
    journalEntries,
    journalEntryLines,
    cash,
    accountsReceivable,
    accountsPayable,
    revenue,
    expense,
    openPeriod,
    createAccount,
    updateAccount,
    setAccountStatus,
    listAccounts,
    getAccount,
    createFiscalPeriod,
    closeFiscalPeriod,
    listFiscalPeriods,
    getOpenFiscalPeriodForDate,
    createJournalEntry,
    reverseJournalEntry,
    listJournalEntries,
    getJournalEntry,
    listJournalEntryLines,
    getTrialBalance,
    getAccountLedger,
  };
}

export type AccountingTestContext = Awaited<ReturnType<typeof buildAccountingTestContext>>;
