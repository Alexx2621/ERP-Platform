import type { SalesChannel } from "./quote.entity";

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "FULFILLED" | "CANCELLED";

export interface SalesOrderProps {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  quoteId: string | null;
  channel: SalesChannel;
  status: SalesOrderStatus;
  currency: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
}

/**
 * `DRAFT -> CONFIRMED -> FULFILLED`, with `CANCELLED` reachable only from
 * `DRAFT`/`CONFIRMED` (never after `FULFILLED` — a fulfilled order is
 * corrected via a SalesReturn, not a cancellation). No `PENDING`/
 * `PROCESSING`/`PARTIALLY_FULFILLED`/`REFUNDED` in this slice — see the
 * schema.prisma docstring on this model for why each is deferred rather
 * than modeled with no real behavior behind it.
 *
 * Confirming and fulfilling are NOT domain-entity methods here — unlike
 * `InventoryTransfer.complete()`, both transitions need to orchestrate a
 * real cross-module call (Inventory's reservation/issue use cases), which
 * domain code must never do (docs/ARCHITECTURE.md §6: domain can't depend
 * on infrastructure or other modules). `confirm()`/`fulfill()`/`cancel()`
 * here only flip status/timestamps; `ConfirmSalesOrderUseCase`/
 * `FulfillSalesOrderUseCase`/`CancelSalesOrderUseCase` own the
 * orchestration and call these after the real inventory effect succeeds.
 */
export class SalesOrder {
  private constructor(private readonly props: SalesOrderProps) {}

  static create(props: SalesOrderProps): SalesOrder {
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Sales order currency must be a 3-letter ISO 4217 code.");
    }
    return new SalesOrder({ ...props, currency });
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
  get customerId(): string {
    return this.props.customerId;
  }
  get quoteId(): string | null {
    return this.props.quoteId;
  }
  get channel(): SalesChannel {
    return this.props.channel;
  }
  get status(): SalesOrderStatus {
    return this.props.status;
  }
  get currency(): string {
    return this.props.currency;
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
  get fulfilledAt(): Date | null {
    return this.props.fulfilledAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  confirm(now: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new Error(`Cannot confirm a sales order in status ${this.props.status}.`);
    }
    this.props.status = "CONFIRMED";
    this.props.confirmedAt = now;
    this.bump();
  }

  fulfill(now: Date): void {
    if (this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot fulfill a sales order in status ${this.props.status}.`);
    }
    this.props.status = "FULFILLED";
    this.props.fulfilledAt = now;
    this.bump();
  }

  cancel(now: Date): void {
    if (this.props.status !== "DRAFT" && this.props.status !== "CONFIRMED") {
      throw new Error(`Cannot cancel a sales order in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.bump();
  }

  toProps(): Readonly<SalesOrderProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
