import { assertValidPositiveDecimal } from "./decimal";

export interface PurchaseReceiptLineProps {
  id: string;
  tenantId: string;
  purchaseReceiptId: string;
  purchaseOrderLineId: string;
  quantity: string;
  createdAt: Date;
}

/**
 * One received quantity against one `PurchaseOrderLine`. Never exceeds what
 * was ever ordered for that line — enforced by
 * `CreatePurchaseReceiptUseCase`, computed as a running sum over every
 * prior `PurchaseReceiptLine` for the same `purchaseOrderLineId` (a ledger
 * read, not a stored running total that could drift, same philosophy as
 * `SalesReturnLine`/`InventoryBalance`).
 */
export class PurchaseReceiptLine {
  private constructor(private readonly props: PurchaseReceiptLineProps) {}

  static create(props: PurchaseReceiptLineProps): PurchaseReceiptLine {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new PurchaseReceiptLine({ ...props, quantity });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get purchaseReceiptId(): string {
    return this.props.purchaseReceiptId;
  }
  get purchaseOrderLineId(): string {
    return this.props.purchaseOrderLineId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PurchaseReceiptLineProps> {
    return { ...this.props };
  }
}
