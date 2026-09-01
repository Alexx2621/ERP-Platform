export type SalesChannel = "ERP" | "POS" | "ECOMMERCE" | "B2B" | "MARKETPLACE" | "MOBILE" | "API";
export type QuoteStatus = "DRAFT" | "CONVERTED" | "CANCELLED";

export interface QuoteProps {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  channel: SalesChannel;
  status: QuoteStatus;
  currency: string;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  convertedAt: Date | null;
  cancelledAt: Date | null;
}

/**
 * A non-binding proposal with its own pricing snapshot (MASTER_SPEC §21:
 * "Diferenciar correctamente: Quote, Order..."). Never reserves inventory —
 * only a confirmed SalesOrder does. `DRAFT -> CONVERTED` (via
 * `ConvertQuoteToSalesOrderUseCase`) or `DRAFT -> CANCELLED` are the only
 * transitions; both are terminal, matching the same "don't model states
 * with no distinct real behavior yet" reasoning already used for
 * `TenantApp` (ADR-005) — this slice has no send/accept/reject workflow.
 */
export class Quote {
  private constructor(private readonly props: QuoteProps) {}

  static create(props: QuoteProps): Quote {
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Quote currency must be a 3-letter ISO 4217 code.");
    }
    return new Quote({ ...props, currency, notes: props.notes?.trim() || null });
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
  get channel(): SalesChannel {
    return this.props.channel;
  }
  get status(): QuoteStatus {
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
  get convertedAt(): Date | null {
    return this.props.convertedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  convert(now: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new Error(`Cannot convert a quote in status ${this.props.status}.`);
    }
    this.props.status = "CONVERTED";
    this.props.convertedAt = now;
    this.bump();
  }

  cancel(now: Date): void {
    if (this.props.status !== "DRAFT") {
      throw new Error(`Cannot cancel a quote in status ${this.props.status}.`);
    }
    this.props.status = "CANCELLED";
    this.props.cancelledAt = now;
    this.bump();
  }

  toProps(): Readonly<QuoteProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
