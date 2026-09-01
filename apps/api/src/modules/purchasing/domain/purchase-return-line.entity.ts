import { assertValidPositiveDecimal } from "./decimal";

export interface PurchaseReturnLineProps {
  id: string;
  tenantId: string;
  purchaseReturnId: string;
  purchaseOrderLineId: string;
  quantity: string;
  createdAt: Date;
}

/**
 * One returned-to-supplier quantity against one `PurchaseOrderLine`. Never
 * exceeds what was ever received minus what was already returned for that
 * line — enforced by `CreatePurchaseReturnUseCase` as a running-sum ledger
 * read over both `PurchaseReceiptLine` and `PurchaseReturnLine`, same
 * philosophy as `SalesReturnLine`.
 */
export class PurchaseReturnLine {
  private constructor(private readonly props: PurchaseReturnLineProps) {}

  static create(props: PurchaseReturnLineProps): PurchaseReturnLine {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new PurchaseReturnLine({ ...props, quantity });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get purchaseReturnId(): string {
    return this.props.purchaseReturnId;
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

  toProps(): Readonly<PurchaseReturnLineProps> {
    return { ...this.props };
  }
}
