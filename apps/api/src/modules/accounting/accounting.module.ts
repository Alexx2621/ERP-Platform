import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { AppRegistryModule } from "../../core/app-registry";
import { ACCOUNT_REPOSITORY } from "./domain/account.repository";
import { FISCAL_PERIOD_REPOSITORY } from "./domain/fiscal-period.repository";
import { JOURNAL_ENTRY_REPOSITORY } from "./domain/journal-entry.repository";
import { JOURNAL_ENTRY_LINE_REPOSITORY } from "./domain/journal-entry-line.repository";
import { PrismaAccountRepository } from "./infrastructure/prisma-account.repository";
import { PrismaFiscalPeriodRepository } from "./infrastructure/prisma-fiscal-period.repository";
import { PrismaJournalEntryRepository } from "./infrastructure/prisma-journal-entry.repository";
import { PrismaJournalEntryLineRepository } from "./infrastructure/prisma-journal-entry-line.repository";
import { CreateAccountUseCase } from "./application/use-cases/create-account.use-case";
import { UpdateAccountUseCase } from "./application/use-cases/update-account.use-case";
import { SetAccountStatusUseCase } from "./application/use-cases/set-account-status.use-case";
import { ListAccountsUseCase } from "./application/use-cases/list-accounts.use-case";
import { GetAccountUseCase } from "./application/use-cases/get-account.use-case";
import { CreateFiscalPeriodUseCase } from "./application/use-cases/create-fiscal-period.use-case";
import { CloseFiscalPeriodUseCase } from "./application/use-cases/close-fiscal-period.use-case";
import { ListFiscalPeriodsUseCase } from "./application/use-cases/list-fiscal-periods.use-case";
import { GetOpenFiscalPeriodForDateUseCase } from "./application/use-cases/get-open-fiscal-period-for-date.use-case";
import { CreateJournalEntryUseCase } from "./application/use-cases/create-journal-entry.use-case";
import { ReverseJournalEntryUseCase } from "./application/use-cases/reverse-journal-entry.use-case";
import { ListJournalEntriesUseCase } from "./application/use-cases/list-journal-entries.use-case";
import { GetJournalEntryUseCase } from "./application/use-cases/get-journal-entry.use-case";
import { ListJournalEntryLinesUseCase } from "./application/use-cases/list-journal-entry-lines.use-case";
import { GetTrialBalanceUseCase } from "./application/use-cases/get-trial-balance.use-case";
import { GetAccountLedgerUseCase } from "./application/use-cases/get-account-ledger.use-case";
import { AccountsController } from "./presentation/accounts.controller";
import { FiscalPeriodsController } from "./presentation/fiscal-periods.controller";
import { JournalEntriesController } from "./presentation/journal-entries.controller";
import { AccountingReportsController } from "./presentation/accounting-reports.controller";

/**
 * Phase 8 (Accounting) module — sibling of Sales/Purchasing/POS/Commerce,
 * deliberately outside `core/` (docs/ARCHITECTURE.md §5.3-§5.4). Unlike
 * every other business module built so far, Accounting has zero
 * cross-module imports: `CreateJournalEntryUseCase` accepts an
 * `accountId`/`sourceType`/`sourceId` it never resolves against another
 * module's own entities (Sales/Payments/Purchasing/Inventory do not call
 * in yet — docs/DECISIONS.md ADR-012). It exists as a real, tested,
 * independently postable double-entry engine, ready for a future phase to
 * wire a real integration mapping into it.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, AppRegistryModule],
  controllers: [AccountsController, FiscalPeriodsController, JournalEntriesController, AccountingReportsController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: FISCAL_PERIOD_REPOSITORY, useClass: PrismaFiscalPeriodRepository },
    { provide: JOURNAL_ENTRY_REPOSITORY, useClass: PrismaJournalEntryRepository },
    { provide: JOURNAL_ENTRY_LINE_REPOSITORY, useClass: PrismaJournalEntryLineRepository },
    CreateAccountUseCase,
    UpdateAccountUseCase,
    SetAccountStatusUseCase,
    ListAccountsUseCase,
    GetAccountUseCase,
    CreateFiscalPeriodUseCase,
    CloseFiscalPeriodUseCase,
    ListFiscalPeriodsUseCase,
    GetOpenFiscalPeriodForDateUseCase,
    CreateJournalEntryUseCase,
    ReverseJournalEntryUseCase,
    ListJournalEntriesUseCase,
    GetJournalEntryUseCase,
    ListJournalEntryLinesUseCase,
    GetTrialBalanceUseCase,
    GetAccountLedgerUseCase,
  ],
  exports: [GetAccountUseCase, CreateJournalEntryUseCase, ReverseJournalEntryUseCase],
})
export class AccountingModule {}
