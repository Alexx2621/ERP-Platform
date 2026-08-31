import { assertValidDecimal } from "./decimal";

export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface ProductVariantProps {
  id: string;
  tenantId: string;
  productId: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, string>;
  price: string;
  cost: string | null;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A sellable SKU for a `hasVariants` product (MASTER_SPEC §19: "Camisa →
 * Azul/S, Azul/M, ..."). `attributes` is a plain string-keyed record — the
 * domain never depends on Prisma's JSON type; infrastructure serializes it
 * directly (docs/ARCHITECTURE.md §57: JSONB only where flexibility is
 * genuinely needed).
 */
export class ProductVariant {
  private constructor(private readonly props: ProductVariantProps) {}

  static create(props: ProductVariantProps): ProductVariant {
    const sku = props.sku.trim();
    if (!sku) throw new Error("Variant SKU is required.");
    if (Object.keys(props.attributes).length === 0) {
      throw new Error("A variant requires at least one attribute (e.g. color, size).");
    }
    const price = assertValidDecimal(props.price, "price");
    const cost = props.cost === null ? null : assertValidDecimal(props.cost, "cost");
    return new ProductVariant({ ...props, sku, price, cost });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get sku(): string {
    return this.props.sku;
  }
  get barcode(): string | null {
    return this.props.barcode;
  }
  get attributes(): Readonly<Record<string, string>> {
    return { ...this.props.attributes };
  }
  get price(): string {
    return this.props.price;
  }
  get cost(): string | null {
    return this.props.cost;
  }
  get status(): MasterDataStatus {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  reprice(price: string, cost: string | null): void {
    this.props.price = assertValidDecimal(price, "price");
    this.props.cost = cost === null ? null : assertValidDecimal(cost, "cost");
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<ProductVariantProps> {
    return { ...this.props, attributes: { ...this.props.attributes } };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
