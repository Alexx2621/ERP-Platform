import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  AccountCodeAlreadyInUseError,
  AccountNotActiveError,
  AccountNotFoundError,
  CompanyContextRequiredError,
  FiscalPeriodCodeAlreadyInUseError,
  FiscalPeriodNotFoundError,
  FiscalPeriodOverlapsExistingError,
  JournalEntryAlreadyReversedError,
  JournalEntryHasTooFewLinesError,
  JournalEntryNotBalancedError,
  JournalEntryNotFoundError,
  NoOpenFiscalPeriodForDateError,
  ParentAccountNotFoundError,
} from "../application/errors";

/**
 * `JournalEntryIdempotencyConflictError` is deliberately not handled here —
 * per its own docstring it never reaches an HTTP caller under normal
 * operation (`CreateJournalEntryUseCase` always catches it and re-fetches
 * the winner); if it ever did leak through, that would itself be a genuine
 * internal inconsistency worth a 500, not a normal user-facing error.
 * Mirrors `commerce-error.mapper.ts` leaving `CommerceOrderIdempotencyConflictError` unmapped for the same reason.
 */
export function handleAccountingError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof AccountNotFoundError) {
    throw new AppException("ACCOUNT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof AccountCodeAlreadyInUseError) {
    throw new AppException("ACCOUNT_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof AccountNotActiveError) {
    throw new AppException("ACCOUNT_NOT_ACTIVE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ParentAccountNotFoundError) {
    throw new AppException("PARENT_ACCOUNT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof FiscalPeriodNotFoundError) {
    throw new AppException("FISCAL_PERIOD_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof FiscalPeriodCodeAlreadyInUseError) {
    throw new AppException("FISCAL_PERIOD_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof FiscalPeriodOverlapsExistingError) {
    throw new AppException("FISCAL_PERIOD_OVERLAPS_EXISTING", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof NoOpenFiscalPeriodForDateError) {
    throw new AppException("NO_OPEN_FISCAL_PERIOD_FOR_DATE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof JournalEntryNotFoundError) {
    throw new AppException("JOURNAL_ENTRY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof JournalEntryHasTooFewLinesError) {
    throw new AppException("JOURNAL_ENTRY_TOO_FEW_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof JournalEntryNotBalancedError) {
    throw new AppException("JOURNAL_ENTRY_NOT_BALANCED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof JournalEntryAlreadyReversedError) {
    throw new AppException("JOURNAL_ENTRY_ALREADY_REVERSED", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
