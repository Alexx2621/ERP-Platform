export interface SalesReturnProps {
  id: string;
  tenantId: string;
  companyId: string;
  salesOrderId: string;
  reason: string | null;
  createdAt: Date;
}

/**
 * A return is its own append-only record, not a `SalesOrder` status
 * mutation — a `FULFILLED` order stays `FULFILLED` regardless of how many
 * returns are later recorded against it (see `SalesOrder`'s docstring).
 * Never edited or cancelled once created — a genuine correction to a
 * return would need its own new record, matching the ledger philosophy
 * already used for `InventoryMovement`.
 */
export class SalesReturn {
  private constructor(private readonly props: SalesReturnProps) {}

  static create(props: SalesReturnProps): SalesReturn {
    return new SalesReturn({ ...props, reason: props.reason?.trim() || null });
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
  get reason(): string | null {
    return this.props.reason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<SalesReturnProps> {
    return { ...this.props };
  }
}
