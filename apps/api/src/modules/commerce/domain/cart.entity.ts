export type CartStatus = "OPEN" | "CONVERTED";

export interface CartProps {
  id: string;
  tenantId: string;
  companyId: string;
  storefrontId: string;
  currency: string;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Anonymous by design — no session, no authentication. `Cart.id` itself is
 * the public "cart token" a shopper's browser holds, the same
 * "an unguessable UUID is public-identifier-safe" precedent
 * `FileObject.storageKey` already sets (a cart carries no money and no PII
 * beyond what a guest later types at checkout, so this is a far lower
 * stakes identifier than a Session's own hashed token). `status` moves
 * `OPEN -> CONVERTED` exactly once, on a successful checkout — there is no
 * abandonment job in this slice (MASTER_SPEC §59: no state with no real
 * code path behind it), so an inactive cart simply stays `OPEN` forever.
 */
export class Cart {
  private constructor(private readonly props: CartProps) {}

  static create(props: CartProps): Cart {
    const currency = props.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Cart currency must be a 3-letter ISO 4217 code.");
    }
    return new Cart({ ...props, currency });
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
  get currency(): string {
    return this.props.currency;
  }
  get status(): CartStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  convert(): void {
    if (this.props.status !== "OPEN") {
      throw new Error(`Cannot convert a cart in status ${this.props.status}.`);
    }
    this.props.status = "CONVERTED";
    this.props.updatedAt = new Date();
  }

  toProps(): Readonly<CartProps> {
    return { ...this.props };
  }
}
