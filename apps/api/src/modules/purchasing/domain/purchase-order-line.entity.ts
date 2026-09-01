import { assertValidNonNegativeDecimal, assertValidPositiveDecimal, multiplyDecimal } from "./decimal";

export interface PurchaseOrderLineProps {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  warehouseId: string | null;
  productId: string;
  productVariantId: string | null;
  quantity: string;
  unitCost: string;
  lineTotal: string;
  createdAt: Date;
}

export interface PurchaseOrderLineInput {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  warehouseId: string | null;
  productId: string;
  productVariantId: string | null;
  quantity: string;
  unitCost: string;
  createdAt: Date;
}

/**
 * Same double-factory contract as `SalesOrderLine`: `.create()` computes
 * `lineTotal = quantity × unitCost` (a snapshot of what was agreed with the
 * supplier at order time — no discount/tax on this line, unlike Sales;
 * a supplier's own tax breakdown belongs on `SupplierInvoice`, which is a
 * separate document per docs/ROADMAP.md §9), `.fromProps()` trusts the
 * stored value since `lineTotal` is a historical fact, not something to
 * recompute silently on read. `warehouseId` is nullable — required only
 * when the product tracks inventory, enforced at the application layer
 * (`ResolvePurchaseLineTargetUseCase`), same reasoning as
 * `SalesOrderLine.warehouseId`.
 */
export class PurchaseOrderLine {
  private constructor(private readonly props: PurchaseOrderLineProps) {}

  static create(input: PurchaseOrderLineInput): PurchaseOrderLine {
    const quantity = assertValidPositiveDecimal(input.quantity, "quantity");
    const unitCost = assertValidNonNegativeDecimal(input.unitCost, "unitCost");
    const lineTotal = multiplyDecimal(quantity, unitCost);

    return new PurchaseOrderLine({
      id: input.id,
      tenantId: input.tenantId,
      purchaseOrderId: input.purchaseOrderId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      quantity,
      unitCost,
      lineTotal,
      createdAt: input.createdAt,
    });
  }

  static fromProps(props: PurchaseOrderLineProps): PurchaseOrderLine {
    return new PurchaseOrderLine({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get purchaseOrderId(): string {
    return this.props.purchaseOrderId;
  }
  get warehouseId(): string | null {
    return this.props.warehouseId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get productVariantId(): string | null {
    return this.props.productVariantId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get unitCost(): string {
    return this.props.unitCost;
  }
  get lineTotal(): string {
    return this.props.lineTotal;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<PurchaseOrderLineProps> {
    return { ...this.props };
  }
}
