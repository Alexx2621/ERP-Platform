export type StorefrontProductStatus = "PUBLISHED" | "UNPUBLISHED";

export interface StorefrontProductProps {
  id: string;
  tenantId: string;
  storefrontId: string;
  productId: string;
  status: StorefrontProductStatus;
  publishedAt: Date;
}

/**
 * The publication join — a `Product` is never visible through the public
 * storefront API unless it has a `PUBLISHED` row here for that specific
 * storefront (MASTER_SPEC §23's "catalog publication"), keeping the full
 * internal Catalog decoupled from what a given storefront chooses to show.
 */
export class StorefrontProduct {
  private constructor(private readonly props: StorefrontProductProps) {}

  static create(props: StorefrontProductProps): StorefrontProduct {
    return new StorefrontProduct({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get storefrontId(): string {
    return this.props.storefrontId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get status(): StorefrontProductStatus {
    return this.props.status;
  }
  get publishedAt(): Date {
    return this.props.publishedAt;
  }

  unpublish(): void {
    this.props.status = "UNPUBLISHED";
  }

  republish(now: Date): void {
    this.props.status = "PUBLISHED";
    this.props.publishedAt = now;
  }

  toProps(): Readonly<StorefrontProductProps> {
    return { ...this.props };
  }
}
