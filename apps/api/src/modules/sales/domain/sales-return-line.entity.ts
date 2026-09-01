import { assertValidPositiveDecimal } from "./decimal";

export interface SalesReturnLineProps {
  id: string;
  tenantId: string;
  salesReturnId: string;
  salesOrderLineId: string;
  quantity: string;
  createdAt: Date;
}

/**
 * One returned quantity against one `SalesOrderLine`. Never exceeds what
 * was ever fulfilled for that line — enforced by
 * `CreateSalesReturnUseCase`, computed as a running sum over every prior
 * `SalesReturnLine` for the same `salesOrderLineId` (a ledger read, not a
 * stored running total that could drift, same philosophy as
 * `InventoryBalance`).
 */
export class SalesReturnLine {
  private constructor(private readonly props: SalesReturnLineProps) {}

  static create(props: SalesReturnLineProps): SalesReturnLine {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new SalesReturnLine({ ...props, quantity });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get salesReturnId(): string {
    return this.props.salesReturnId;
  }
  get salesOrderLineId(): string {
    return this.props.salesOrderLineId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<SalesReturnLineProps> {
    return { ...this.props };
  }
}
