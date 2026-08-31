import { assertValidDecimal } from "./decimal";

export type ProductType = "PHYSICAL_GOOD" | "SERVICE" | "DIGITAL_PRODUCT" | "RAW_MATERIAL";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

export interface ProductProps {
  id: string;
  tenantId: string;
  companyId: string;
  categoryId: string | null;
  brandId: string | null;
  unitOfMeasureId: string;
  code: string;
  name: string;
  description: string | null;
  type: ProductType;
  trackInventory: boolean;
  sellable: boolean;
  purchasable: boolean;
  hasVariants: boolean;
  publishOnline: boolean;
  barcode: string | null;
  basePrice: string | null;
  baseCost: string | null;
  status: ProductStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Kit/Bundle types and lot/serial/expiration tracking (MASTER_SPEC §19/§20)
 * are deliberately out of scope — nothing downstream consumes them yet.
 * `basePrice`/`baseCost` are the product's own price when `hasVariants` is
 * false; each `ProductVariant` carries its own price/cost when `hasVariants`
 * is true. Multi-tier price lists live in the separate `pricing` module
 * (`PriceList`/`PriceListItem`, product-only — see that module's own
 * docstrings for why variant-level list pricing is still deferred).
 */
export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(props: ProductProps): Product {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Product code is required.");
    if (!name) throw new Error("Product name is required.");
    if (!props.hasVariants && props.sellable && !props.basePrice) {
      throw new Error("A sellable product without variants requires a basePrice.");
    }
    if (props.hasVariants && (props.basePrice !== null || props.baseCost !== null)) {
      throw new Error("A product with variants must not carry its own basePrice/baseCost.");
    }
    const basePrice = props.basePrice === null ? null : assertValidDecimal(props.basePrice, "basePrice");
    const baseCost = props.baseCost === null ? null : assertValidDecimal(props.baseCost, "baseCost");
    return new Product({
      ...props,
      code,
      name,
      description: props.description?.trim() || null,
      basePrice,
      baseCost,
    });
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
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get brandId(): string | null {
    return this.props.brandId;
  }
  get unitOfMeasureId(): string {
    return this.props.unitOfMeasureId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get type(): ProductType {
    return this.props.type;
  }
  get trackInventory(): boolean {
    return this.props.trackInventory;
  }
  get sellable(): boolean {
    return this.props.sellable;
  }
  get purchasable(): boolean {
    return this.props.purchasable;
  }
  get hasVariants(): boolean {
    return this.props.hasVariants;
  }
  get publishOnline(): boolean {
    return this.props.publishOnline;
  }
  get barcode(): string | null {
    return this.props.barcode;
  }
  get basePrice(): string | null {
    return this.props.basePrice;
  }
  get baseCost(): string | null {
    return this.props.baseCost;
  }
  get status(): ProductStatus {
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

  update(fields: {
    name: string;
    description: string | null;
    categoryId: string | null;
    brandId: string | null;
    barcode: string | null;
    basePrice: string | null;
    baseCost: string | null;
    trackInventory: boolean;
    sellable: boolean;
    purchasable: boolean;
    publishOnline: boolean;
  }): void {
    const name = fields.name.trim();
    if (!name) throw new Error("Product name is required.");
    if (!this.props.hasVariants && fields.sellable && !fields.basePrice) {
      throw new Error("A sellable product without variants requires a basePrice.");
    }
    this.props.name = name;
    this.props.description = fields.description?.trim() || null;
    this.props.categoryId = fields.categoryId;
    this.props.brandId = fields.brandId;
    this.props.barcode = fields.barcode;
    this.props.basePrice = fields.basePrice === null ? null : assertValidDecimal(fields.basePrice, "basePrice");
    this.props.baseCost = fields.baseCost === null ? null : assertValidDecimal(fields.baseCost, "baseCost");
    this.props.trackInventory = fields.trackInventory;
    this.props.sellable = fields.sellable;
    this.props.purchasable = fields.purchasable;
    this.props.publishOnline = fields.publishOnline;
    this.bump();
  }

  setStatus(status: ProductStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<ProductProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
