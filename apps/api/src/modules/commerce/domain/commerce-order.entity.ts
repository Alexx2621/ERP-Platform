export interface CommerceOrderProps {
  id: string;
  tenantId: string;
  companyId: string;
  storefrontId: string;
  cartId: string;
  salesOrderId: string;
  paymentId: string | null;
  customerId: string;
  guestEmail: string;
  total: string;
  currency: string;
  createdAt: Date;
}

/**
 * The Commerce-owned record of a completed checkout — mirrors POS's own
 * `PosSale` closely (see that entity's docstring), created only after a
 * real `SalesOrder` (channel `ECOMMERCE`) is confirmed through Sales' own
 * public contract. Two deliberate differences from `PosSale`, both spelled
 * out in `CheckoutUseCase`'s own docstring and ADR-011: (1) idempotency is
 * keyed by `cartId` itself, not a caller-supplied string — a Cart converts
 * at most once, so it already is the natural dedup key; (2) `paymentId` is
 * nullable and the order is never auto-fulfilled here — unlike an in-person
 * POS sale, an online order routinely gets paid (BANK_TRANSFER, a
 * self-declared reference) and fulfilled (warehouse pick/pack) at a
 * *later* time, through the very same Sales/Payments screens already built
 * for every other channel.
 */
export class CommerceOrder {
  private constructor(private readonly props: CommerceOrderProps) {}

  static create(props: CommerceOrderProps): CommerceOrder {
    return new CommerceOrder({ ...props });
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
  get storefrontId(): string {
    return this.props.storefrontId;
  }
  get cartId(): string {
    return this.props.cartId;
  }
  get salesOrderId(): string {
    return this.props.salesOrderId;
  }
  get paymentId(): string | null {
    return this.props.paymentId;
  }
  get customerId(): string {
    return this.props.customerId;
  }
  get guestEmail(): string {
    return this.props.guestEmail;
  }
  get total(): string {
    return this.props.total;
  }
  get currency(): string {
    return this.props.currency;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<CommerceOrderProps> {
    return { ...this.props };
  }
}
