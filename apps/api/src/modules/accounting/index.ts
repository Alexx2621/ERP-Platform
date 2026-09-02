/** Public contract of the Accounting module. Other modules must only import from here. */
export { Account, type AccountProps, type AccountType, type NormalBalance } from "./domain/account.entity";
export { FiscalPeriod, type FiscalPeriodProps, type FiscalPeriodStatus } from "./domain/fiscal-period.entity";
export { JournalEntry, type JournalEntryProps } from "./domain/journal-entry.entity";
export { JournalEntryLine, type JournalEntryLineProps } from "./domain/journal-entry-line.entity";
export { GetAccountUseCase } from "./application/use-cases/get-account.use-case";
export {
  CreateJournalEntryUseCase,
  type CreateJournalEntryInput,
  type CreateJournalEntryLineInput,
  type CreateJournalEntryResult,
} from "./application/use-cases/create-journal-entry.use-case";
export { ReverseJournalEntryUseCase, type ReverseJournalEntryInput } from "./application/use-cases/reverse-journal-entry.use-case";
export * from "./application/errors";
export { AccountsController } from "./presentation/accounts.controller";
export { FiscalPeriodsController } from "./presentation/fiscal-periods.controller";
export { JournalEntriesController } from "./presentation/journal-entries.controller";
export { AccountingReportsController } from "./presentation/accounting-reports.controller";
export { AccountingModule } from "./accounting.module";
