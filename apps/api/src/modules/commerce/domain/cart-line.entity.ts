import { assertValidPositiveDecimal } from "./decimal";

export interface CartLineProps {
  id: string;
  tenantId: string;
  cartId: string;
  productId: string;
  productVariantId: string | null;
  quantity: string;
  unitPrice: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One line per (cart, product, variant) — `AddCartLineUseCase` increases
 * `quantity` on an existing line instead of creating a second one for the
 * same target, an application-level rule (no partial-unique index for it,
 * the same accepted-gap style already used for `PosShift`'s "at most one
 * OPEN shift per register" — a cart is not money-critical data on its own,
 * unlike a shift). `unitPrice` is snapshotted from the Catalog at add-time,
 * the same "don't silently recompute a snapshotted fact" reasoning
 * `SalesOrderLine.unitPrice` already established — a price change after
 * adding to cart never silently changes what the shopper already sees.
 */
export class CartLine {
  private constructor(private readonly props: CartLineProps) {}

  static create(props: CartLineProps): CartLine {
    const quantity = assertValidPositiveDecimal(props.quantity, "quantity");
    const unitPrice = assertValidPositiveDecimal(props.unitPrice, "unitPrice");
    return new CartLine({ ...props, quantity, unitPrice });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get cartId(): string {
    return this.props.cartId;
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
  get unitPrice(): string {
    return this.props.unitPrice;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  setQuantity(quantity: string): void {
    this.props.quantity = assertValidPositiveDecimal(quantity, "quantity");
    this.props.updatedAt = new Date();
  }

  toProps(): Readonly<CartLineProps> {
    return { ...this.props };
  }
}
