import { assertValidPositiveDecimal } from "./decimal";

export interface ProductionOrderFinishedGoodsReceiptProps {
  id: string;
  tenantId: string;
  productionOrderId: string;
  quantity: string;
  createdAt: Date;
}

/**
 * A real, genuinely partial receipt of finished goods into the order's
 * warehouse — the same "recepción parcial" pattern `PurchaseReceiptLine`
 * already established for Purchasing, validated against `quantityPlanned`
 * minus the running sum of prior receipts.
 * `RecordFinishedGoodsUseCase` posts the matching real `RECEIPT`
 * Inventory movement in the same call.
 */
export class ProductionOrderFinishedGoodsReceipt {
  private constructor(private readonly props: ProductionOrderFinishedGoodsReceiptProps) {}

  static create(props: ProductionOrderFinishedGoodsReceiptProps): ProductionOrderFinishedGoodsReceipt {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    return new ProductionOrderFinishedGoodsReceipt({ ...props, quantity });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get productionOrderId(): string {
    return this.props.productionOrderId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<ProductionOrderFinishedGoodsReceiptProps> {
    return { ...this.props };
  }
}
