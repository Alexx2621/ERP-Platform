import { assertValidPositiveDecimal } from "./decimal";

export type PaymentMethod = "CASH" | "BANK_TRANSFER";
export type PaymentStatus = "CAPTURED" | "REFUNDED" | "FAILED";

export interface PaymentProps {
  id: string;
  tenantId: string;
  companyId: string;
  salesOrderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  currency: string;
  idempotencyKey: string;
  gatewayReference: string | null;
  failureReason: string | null;
  createdAt: Date;
  capturedAt: Date | null;
  refundedAt: Date | null;
}

/**
 * MASTER_SPEC §22's `PaymentGateway` contract, deliberately scoped to only
 * the two adapters that need no external credentials — `CASH`/
 * `BANK_TRANSFER` (see `docs/DECISIONS.md`, Payments section) — never a
 * fabricated `StripeAdapter`/`PayPalAdapter` pretending to call a real
 * provider (MASTER_SPEC §90). A capture attempt is always synchronous and
 * terminal: it resolves to `CAPTURED` or `FAILED` in the same call, never
 * `PENDING` — there is no async webhook to reconcile later for either
 * method. `Payment.create()` is always given the already-decided outcome
 * (`CapturePaymentUseCase` calls the gateway first, then builds the entity
 * with `status` already set to `CAPTURED` or `FAILED`) rather than having
 * two separate factories, matching the "the domain has no way to know the
 * gateway's answer without asking it" reasoning already used by Sales'
 * `ResolveSalesLineTargetUseCase` for cross-module facts.
 */
export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  static create(props: PaymentProps): Payment {
    const amount = assertValidPositiveDecimal(props.amount, "amount");
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Payment currency must be a 3-letter ISO 4217 code.");
    }
    const idempotencyKey = props.idempotencyKey.trim();
    if (idempotencyKey.length === 0) {
      throw new Error("idempotencyKey must not be empty.");
    }
    return new Payment({ ...props, amount, currency, idempotencyKey });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get companyId(): string {
    return this.props.companyId;
  }
  get salesOrderId(): string {
    return this.props.salesOrderId;
  }
  get method(): PaymentMethod {
    return this.props.method;
  }
  get status(): PaymentStatus {
    return this.props.status;
  }
  get amount(): string {
    return this.props.amount;
  }
  get currency(): string {
    return this.props.currency;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get gatewayReference(): string | null {
    return this.props.gatewayReference;
  }
  get failureReason(): string | null {
    return this.props.failureReason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get capturedAt(): Date | null {
    return this.props.capturedAt;
  }
  get refundedAt(): Date | null {
    return this.props.refundedAt;
  }

  /** Only a CAPTURED payment can be refunded — a FAILED capture never took real money, and a REFUNDED one already gave it back. */
  refund(now: Date): void {
    if (this.props.status !== "CAPTURED") {
      throw new Error(`Cannot refund a payment in status ${this.props.status}.`);
    }
    this.props.status = "REFUNDED";
    this.props.refundedAt = now;
  }

  toProps(): Readonly<PaymentProps> {
    return { ...this.props };
  }
}
