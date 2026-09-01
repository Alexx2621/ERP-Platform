import { assertValidPositiveDecimal } from "./decimal";

export type PosPaymentMethod = "CASH" | "BANK_TRANSFER";

export interface PosSaleProps {
  id: string;
  tenantId: string;
  companyId: string;
  shiftId: string;
  salesOrderId: string;
  paymentId: string;
  idempotencyKey: string;
  paymentMethod: PosPaymentMethod;
  amount: string;
  amountTendered: string | null;
  changeDue: string | null;
  createdAt: Date;
}

/**
 * The POS-owned record of a completed sale — created only after the real
 * `SalesOrder` (channel `POS`) is confirmed and fulfilled and its `Payment`
 * is `CAPTURED`; nothing is persisted here for an attempt that fails
 * partway (`RingUpSaleUseCase` compensates by cancelling the order instead
 * — see that use case's own docstring). `paymentMethod`/`amount` are
 * snapshotted from the real `Payment` at creation time so `CloseShiftUseCase`
 * can sum a shift's cash sales with one indexed query instead of joining out
 * to `Payment` per row — the same "snapshot a fact that must never silently
 * drift" reasoning Sales' own `SalesOrderLine.unitPrice` already established.
 */
export class PosSale {
  private constructor(private readonly props: PosSaleProps) {}

  static create(props: PosSaleProps): PosSale {
    const amount = assertValidPositiveDecimal(props.amount, "amount");
    const idempotencyKey = props.idempotencyKey.trim();
    if (!idempotencyKey) throw new Error("idempotencyKey must not be empty.");
    return new PosSale({ ...props, amount, idempotencyKey });
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
  get shiftId(): string {
    return this.props.shiftId;
  }
  get salesOrderId(): string {
    return this.props.salesOrderId;
  }
  get paymentId(): string {
    return this.props.paymentId;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get paymentMethod(): PosPaymentMethod {
    return this.props.paymentMethod;
  }
  get amount(): string {
    return this.props.amount;
  }
  get amountTendered(): string | null {
    return this.props.amountTendered;
  }
  get changeDue(): string | null {
    return this.props.changeDue;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PosSaleProps> {
    return { ...this.props };
  }
}
