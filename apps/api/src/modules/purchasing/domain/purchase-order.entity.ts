export type PurchaseOrderStatus = "DRAFT" | "CONFIRMED" | "CLOSED" | "CANCELLED";

export interface PurchaseOrderProps {
  id: string;
  tenantId: string;
  companyId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  currency: string;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
}

/**
 * `DRAFT -> CONFIRMED -> CLOSED`, with `CANCELLED` reachable only from
 * `DRAFT`/`CONFIRMED` — never from `CLOSED` (docs/ROADMAP.md §9's "Returns
 * y estados de cierre"). Unlike `SalesOrder.fulfill()`, closing does not
 * require every line to be fully received: partial receipt is explicit,
 * real-world purchasing behavior (a supplier may permanently backorder a
 * remainder), so `close()` is a deliberate business decision the caller
 * makes, not a status the domain derives automatically from received
 * quantities. `CancelPurchaseOrderUseCase` additionally rejects cancelling
 * a `CONFIRMED` order that already has at least one receipt — that
 * invariant needs a cross-table read (`PurchaseReceiptRepository`), so it
 * lives in the use case, not here (docs/ARCHITECTURE.md §6: domain can't
 * query other tables).
 *
 * `confirm()`/`close()`/`cancel()` only flip status/timestamps — same
 * reasoning as `SalesOrder`: any cross-module orchestration (none needed
 * for confirm/close here, since Purchasing doesn't reserve inventory the
 * way Sales does) belongs in the use case, not the entity.
 */
export class PurchaseOrder {
  private constructor(private readonly props: PurchaseOrderProps) {}

  static create(props: PurchaseOrderProps): PurchaseOrder {
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Purchase order currency must be a 3-letter ISO 4217 code.");
    }
    return new PurchaseOrder({ ...props, currency, notes: props.notes?.trim() || null });
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
  get supplierId(): string {
    return this.props.supplierId;
  }
  get status(): PurchaseOrderStatus {
    return this.props.status;
  }
  get currency(): string {
    return this.props.currency;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get confirmedAt(): Date | null {
    return this.props.confirmedAt;
  }
  get closedAt(): Date | null {
    return this.props.closedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  confirm(now: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new Error(`Cannot confirm a purchase order in status ${this.props.status}.`);
    }
    this.props.status = "CONFIRMED";
    this.props.confirmedAt = now;
    this.bump();
  }

  close(now: Date): void {
    if (this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot close a purchase order in status ${this.props.status}.`);
    }
    this.props.status = "CLOSED";
    this.props.closedAt = now;
    this.bump();
  }

  cancel(now: Date): void {
    if (this.props.status !== "DRAFT" && this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot cancel a purchase order in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.bump();
  }

  toProps(): Readonly<PurchaseOrderProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
