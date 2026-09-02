export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account was not found in this company.");
    this.name = "AccountNotFoundError";
  }
}

export class AccountCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Account code "${code}" is already in use in this company.`);
    this.name = "AccountCodeAlreadyInUseError";
  }
}

export class AccountNotActiveError extends Error {
  constructor(code: string) {
    super(`Account "${code}" is INACTIVE; only an ACTIVE account can receive a posting.`);
    this.name = "AccountNotActiveError";
  }
}

export class ParentAccountNotFoundError extends Error {
  constructor() {
    super("Parent account was not found in this company.");
    this.name = "ParentAccountNotFoundError";
  }
}

export class FiscalPeriodNotFoundError extends Error {
  constructor() {
    super("Fiscal period was not found in this company.");
    this.name = "FiscalPeriodNotFoundError";
  }
}

export class FiscalPeriodCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Fiscal period code "${code}" is already in use in this company.`);
    this.name = "FiscalPeriodCodeAlreadyInUseError";
  }
}

export class FiscalPeriodOverlapsExistingError extends Error {
  constructor() {
    super("This fiscal period's date range overlaps an existing fiscal period for this company.");
    this.name = "FiscalPeriodOverlapsExistingError";
  }
}

export class NoOpenFiscalPeriodForDateError extends Error {
  constructor() {
    super("No OPEN fiscal period covers this entry date.");
    this.name = "NoOpenFiscalPeriodForDateError";
  }
}

export class JournalEntryNotFoundError extends Error {
  constructor() {
    super("Journal entry was not found in this company.");
    this.name = "JournalEntryNotFoundError";
  }
}

export class JournalEntryHasTooFewLinesError extends Error {
  constructor() {
    super("A journal entry requires at least two lines.");
    this.name = "JournalEntryHasTooFewLinesError";
  }
}

export class JournalEntryNotBalancedError extends Error {
  constructor() {
    super("A journal entry's total debits must equal its total credits.");
    this.name = "JournalEntryNotBalancedError";
  }
}

export class JournalEntryAlreadyReversedError extends Error {
  constructor() {
    super("This journal entry has already been reversed.");
    this.name = "JournalEntryAlreadyReversedError";
  }
}

/** Internal, infrastructure-raised signal for a real concurrent race on the same (sourceType, sourceId) key — never returned to an HTTP caller directly (mirrors `CommerceOrderIdempotencyConflictError`). */
export class JournalEntryIdempotencyConflictError extends Error {
  constructor() {
    super("A journal entry for this source was just created by a concurrent request.");
    this.name = "JournalEntryIdempotencyConflictError";
  }
}
