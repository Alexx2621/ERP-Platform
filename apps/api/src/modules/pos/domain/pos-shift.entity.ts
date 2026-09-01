import { assertValidNonNegativeDecimal, subtractDecimal } from "./decimal";

export type PosShiftStatus = "OPEN" | "CLOSED";

export interface PosShiftProps {
  id: string;
  tenantId: string;
  companyId: string;
  registerId: string;
  status: PosShiftStatus;
  openedByUserId: string;
  openedAt: Date;
  openingCash: string;
  closedByUserId: string | null;
  closedAt: Date | null;
  closingCashCounted: string | null;
  closingCashExpected: string | null;
  cashVariance: string | null;
  notes: string | null;
}

/**
 * `OPEN -> CLOSED`, terminal — a register may have at most one `OPEN` shift
 * at a time, enforced by `OpenShiftUseCase` querying for one first (an
 * application-level check, the same style already used for
 * `PurchaseOrderHasReceiptsError` — no partial unique index for this).
 * `close()` is given the already-computed `closingCashExpected` rather than
 * computing it itself — like `SalesOrder.confirm()`/`fulfill()`, this
 * domain method never orchestrates a cross-module read (summing this
 * shift's `PosCashMovement`s/`PosSale`s/`PosReturn`s is `CloseShiftUseCase`'s
 * job); it only derives `cashVariance` from the two already-known amounts
 * and flips status/timestamps.
 */
export class PosShift {
  private constructor(private readonly props: PosShiftProps) {}

  static open(props: PosShiftProps): PosShift {
    const openingCash = assertValidNonNegativeDecimal(props.openingCash, "openingCash");
    return new PosShift({ ...props, openingCash, notes: props.notes?.trim() || null });
  }

  static fromProps(props: PosShiftProps): PosShift {
    return new PosShift(props);
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
  get registerId(): string {
    return this.props.registerId;
  }
  get status(): PosShiftStatus {
    return this.props.status;
  }
  get openedByUserId(): string {
    return this.props.openedByUserId;
  }
  get openedAt(): Date {
    return this.props.openedAt;
  }
  get openingCash(): string {
    return this.props.openingCash;
  }
  get closedByUserId(): string | null {
    return this.props.closedByUserId;
  }
  get closedAt(): Date | null {
    return this.props.closedAt;
  }
  get closingCashCounted(): string | null {
    return this.props.closingCashCounted;
  }
  get closingCashExpected(): string | null {
    return this.props.closingCashExpected;
  }
  get cashVariance(): string | null {
    return this.props.cashVariance;
  }
  get notes(): string | null {
    return this.props.notes;
  }

  close(now: Date, closedByUserId: string, closingCashCounted: string, closingCashExpected: string): void {
    if (this.props.status !== "OPEN") {
      throw new Error(`Cannot close a shift in status ${this.props.status}.`);
    }
    const counted = assertValidNonNegativeDecimal(closingCashCounted, "closingCashCounted");
    this.props.status = "CLOSED";
    this.props.closedByUserId = closedByUserId;
    this.props.closedAt = now;
    this.props.closingCashCounted = counted;
    this.props.closingCashExpected = closingCashExpected;
    this.props.cashVariance = subtractDecimal(counted, closingCashExpected);
  }

  toProps(): Readonly<PosShiftProps> {
    return { ...this.props };
  }
}
