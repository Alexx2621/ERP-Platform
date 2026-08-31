import { assertValidDecimal } from "./decimal";

export interface PriceListItemProps {
  id: string;
  tenantId: string;
  priceListId: string;
  productId: string;
  /** Decimal string (e.g. "24.9900"), never a JS number. */
  price: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One product's price within a PriceList. References `Product` only, not
 * `ProductVariant` — see the schema.prisma docstring on `PriceListItem` and
 * docs/SECURITY.md "Pricing" for why. Has no status of its own; removal is
 * a hard delete (RemovePriceListItemUseCase), not a lifecycle transition.
 */
export class PriceListItem {
  private constructor(private readonly props: PriceListItemProps) {}

  static create(props: PriceListItemProps): PriceListItem {
    assertValidDecimal(props.price, "Price list item price");
    return new PriceListItem({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get priceListId(): string {
    return this.props.priceListId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get price(): string {
    return this.props.price;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  reprice(price: string): void {
    assertValidDecimal(price, "Price list item price");
    this.props.price = price;
    this.props.updatedAt = new Date();
  }

  toProps(): Readonly<PriceListItemProps> {
    return { ...this.props };
  }
}
