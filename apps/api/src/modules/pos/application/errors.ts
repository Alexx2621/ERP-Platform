export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class WarehouseNotFoundError extends Error {
  constructor() {
    super("Warehouse was not found in this company.");
    this.name = "WarehouseNotFoundError";
  }
}

export class PosRegisterNotFoundError extends Error {
  constructor() {
    super("Register was not found in this company.");
    this.name = "PosRegisterNotFoundError";
  }
}

export class PosRegisterCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Register code "${code}" is already in use in this company.`);
    this.name = "PosRegisterCodeAlreadyInUseError";
  }
}

export class PosRegisterNotActiveError extends Error {
  constructor() {
    super("This register is INACTIVE; only an ACTIVE register can open a shift.");
    this.name = "PosRegisterNotActiveError";
  }
}

export class PosRegisterHasOpenShiftError extends Error {
  constructor() {
    super("This register already has an OPEN shift; close it before opening a new one.");
    this.name = "PosRegisterHasOpenShiftError";
  }
}

export class PosShiftNotFoundError extends Error {
  constructor() {
    super("Shift was not found in this company.");
    this.name = "PosShiftNotFoundError";
  }
}

export class PosShiftNotOpenError extends Error {
  constructor() {
    super("This shift is not OPEN.");
    this.name = "PosShiftNotOpenError";
  }
}

export class PosSaleHasNoLinesError extends Error {
  constructor() {
    super("A sale requires at least one line.");
    this.name = "PosSaleHasNoLinesError";
  }
}

export class PosSaleNotFoundError extends Error {
  constructor() {
    super("Sale was not found in this company.");
    this.name = "PosSaleNotFoundError";
  }
}

export class PosSaleAmountTenderedTooLowError extends Error {
  constructor() {
    super("amountTendered must be at least the sale's total amount.");
    this.name = "PosSaleAmountTenderedTooLowError";
  }
}

export class PosPaymentFailedError extends Error {
  constructor(reason: string) {
    super(`Payment was declined: ${reason}`);
    this.name = "PosPaymentFailedError";
  }
}

export class PosReturnHasNoLinesError extends Error {
  constructor() {
    super("A return requires at least one line.");
    this.name = "PosReturnHasNoLinesError";
  }
}

export class PosReturnAlreadyRefundedError extends Error {
  constructor() {
    super("This sale's payment was already refunded by a previous return.");
    this.name = "PosReturnAlreadyRefundedError";
  }
}

/** Internal, infrastructure-raised signal for a real concurrent idempotency-key race — never returned to an HTTP caller directly (mirrors `PaymentIdempotencyConflictError`). */
export class PosSaleIdempotencyConflictError extends Error {
  constructor() {
    super("A sale with this idempotency key was just created by a concurrent request.");
    this.name = "PosSaleIdempotencyConflictError";
  }
}

/** Same pattern as `PosSaleIdempotencyConflictError`, for `PosReturn`. */
export class PosReturnIdempotencyConflictError extends Error {
  constructor() {
    super("A return with this idempotency key was just created by a concurrent request.");
    this.name = "PosReturnIdempotencyConflictError";
  }
}
