export interface PurchaseReturnProps {
  id: string;
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
  reason: string | null;
  createdAt: Date;
}

/**
 * A return is its own append-only record, not a `PurchaseOrder` status
 * mutation — same philosophy as `SalesReturn`. `CreatePurchaseReturnUseCase`
 * posts a real `ISSUE` inventory movement per line (goods physically
 * leaving back to the supplier, `referenceType: "PURCHASE_RETURN"`) and
 * rejects returning more than was ever received for a given
 * `PurchaseOrderLine`, computed as a running sum over `PurchaseReturnLine`.
 */
export class PurchaseReturn {
  private constructor(private readonly props: PurchaseReturnProps) {}

  static create(props: PurchaseReturnProps): PurchaseReturn {
    return new PurchaseReturn({ ...props, reason: props.reason?.trim() || null });
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
  get purchaseOrderId(): string {
    return this.props.purchaseOrderId;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PurchaseReturnProps> {
    return { ...this.props };
  }
}
