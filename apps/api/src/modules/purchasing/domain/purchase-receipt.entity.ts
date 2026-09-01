export interface PurchaseReceiptProps {
  id: string;
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * A receipt is its own append-only record, not a `PurchaseOrder` status
 * mutation — a `CONFIRMED` order stays `CONFIRMED` regardless of how many
 * partial receipts are recorded against it (docs/ROADMAP.md §9: "Recepción
 * parcial ... conservan trazabilidad"); the order only advances to
 * `CLOSED` via an explicit `ClosePurchaseOrderUseCase` call. Never edited
 * once created — same ledger philosophy as `SalesReturn`/`InventoryMovement`.
 */
export class PurchaseReceipt {
  private constructor(private readonly props: PurchaseReceiptProps) {}

  static create(props: PurchaseReceiptProps): PurchaseReceipt {
    return new PurchaseReceipt({ ...props, notes: props.notes?.trim() || null });
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
  get notes(): string | null {
    return this.props.notes;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PurchaseReceiptProps> {
    return { ...this.props };
  }
}
