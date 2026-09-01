export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class PaymentSalesOrderNotFoundError extends Error {
  constructor() {
    super("Sales order was not found in this company.");
    this.name = "PaymentSalesOrderNotFoundError";
  }
}

export class PaymentCurrencyMismatchError extends Error {
  constructor() {
    super("The payment currency does not match the sales order currency.");
    this.name = "PaymentCurrencyMismatchError";
  }
}

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Payment was not found in this company.");
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentNotCapturedError extends Error {
  constructor() {
    super("Only a CAPTURED payment can be refunded.");
    this.name = "PaymentNotCapturedError";
  }
}

export class PaymentRefundFailedError extends Error {
  constructor(reason: string) {
    super(`The refund was rejected by the gateway: ${reason}`);
    this.name = "PaymentRefundFailedError";
  }
}

/** Internal, infrastructure-raised signal for a real concurrent idempotency-key race — never returned to an HTTP caller directly (see `PrismaPaymentRepository.save`, `CapturePaymentUseCase`). */
export class PaymentIdempotencyConflictError extends Error {
  constructor() {
    super("A payment with this idempotency key was just created by a concurrent request.");
    this.name = "PaymentIdempotencyConflictError";
  }
}
