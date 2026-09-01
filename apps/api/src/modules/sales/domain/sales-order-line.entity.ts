import {
  addDecimal,
  applyPercentage,
  assertValidNonNegativeDecimal,
  assertValidPositiveDecimal,
  multiplyDecimal,
  subtractDecimal,
} from "./decimal";

export interface SalesOrderLineProps {
  id: string;
  tenantId: string;
  salesOrderId: string;
  warehouseId: string | null;
  productId: string;
  productVariantId: string | null;
  taxId: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxRate: string;
  lineTotal: string;
  reservationId: string | null;
  createdAt: Date;
}

export interface SalesOrderLineInput {
  id: string;
  tenantId: string;
  salesOrderId: string;
  warehouseId: string | null;
  productId: string;
  productVariantId: string | null;
  taxId: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
  taxRate?: string;
  createdAt: Date;
}

/**
 * Same pricing-snapshot contract as `QuoteLine` — see that entity's
 * docstring for the `lineTotal` formula and why `.create()` (computes) and
 * `.fromProps()` (trusts the stored value) are two separate factories.
 * `warehouseId` is nullable — required only when the product tracks
 * inventory, enforced at the application layer
 * (`ResolveSalesTargetUseCase`), not here: the domain has no way to know
 * whether a given `productId` tracks inventory without calling Catalog.
 * `reservationId` starts `null` and is set exactly once, on confirm
 * (`attachReservation`) — never cleared afterward, a permanent pointer to
 * which `InventoryReservation` this line used even after it is released.
 */
export class SalesOrderLine {
  private constructor(private readonly props: SalesOrderLineProps) {}

  static create(input: SalesOrderLineInput): SalesOrderLine {
    const quantity = assertValidPositiveDecimal(input.quantity, "quantity");
    const unitPrice = assertValidNonNegativeDecimal(input.unitPrice, "unitPrice");
    const discountAmount = assertValidNonNegativeDecimal(input.discountAmount ?? "0", "discountAmount");
    const taxRate = assertValidNonNegativeDecimal(input.taxRate ?? "0", "taxRate");

    const subtotal = subtractDecimal(multiplyDecimal(quantity, unitPrice), discountAmount);
    const tax = applyPercentage(subtotal, taxRate);
    const lineTotal = addDecimal(subtotal, tax);

    return new SalesOrderLine({
      id: input.id,
      tenantId: input.tenantId,
      salesOrderId: input.salesOrderId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      taxId: input.taxId,
      quantity,
      unitPrice,
      discountAmount,
      taxRate,
      lineTotal,
      reservationId: null,
      createdAt: input.createdAt,
    });
  }

  static fromProps(props: SalesOrderLineProps): SalesOrderLine {
    return new SalesOrderLine({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get salesOrderId(): string {
    return this.props.salesOrderId;
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
  get taxId(): string | null {
    return this.props.taxId;
  }
  get quantity(): string {
    return this.props.quantity;
  }
  get unitPrice(): string {
    return this.props.unitPrice;
  }
  get discountAmount(): string {
    return this.props.discountAmount;
  }
  get taxRate(): string {
    return this.props.taxRate;
  }
  get lineTotal(): string {
    return this.props.lineTotal;
  }
  get reservationId(): string | null {
    return this.props.reservationId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  attachReservation(reservationId: string): void {
    if (this.props.reservationId) {
      throw new Error("This line already has a reservation attached.");
    }
    this.props.reservationId = reservationId;
  }

  toProps(): Readonly<SalesOrderLineProps> {
    return { ...this.props };
  }
}
