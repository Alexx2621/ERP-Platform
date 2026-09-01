import {
  addDecimal,
  applyPercentage,
  assertValidNonNegativeDecimal,
  assertValidPositiveDecimal,
  multiplyDecimal,
  subtractDecimal,
} from "./decimal";

export interface QuoteLineProps {
  id: string;
  tenantId: string;
  quoteId: string;
  productId: string;
  productVariantId: string | null;
  taxId: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxRate: string;
  lineTotal: string;
  createdAt: Date;
}

export interface QuoteLineInput {
  id: string;
  tenantId: string;
  quoteId: string;
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
 * Pricing snapshot at the moment the line was added — `unitPrice`/
 * `discountAmount`/`taxRate`/`lineTotal` never change afterward
 * (`QuoteLine` has no update method), even if converted into a
 * SalesOrder — the SalesOrderLine gets its own fresh copy of these same
 * values, not a live reference back to this row.
 *
 * `lineTotal = (quantity × unitPrice − discountAmount) + tax`, where
 * `tax = applyPercentage(subtotal, taxRate)` — tax-inclusive, computed once
 * here using dependency-free BigInt arithmetic (`domain/decimal.ts`), never
 * recomputed from live Catalog/Pricing/Taxes data later.
 */
export class QuoteLine {
  private constructor(private readonly props: QuoteLineProps) {}

  static create(input: QuoteLineInput): QuoteLine {
    const quantity = assertValidPositiveDecimal(input.quantity, "quantity");
    const unitPrice = assertValidNonNegativeDecimal(input.unitPrice, "unitPrice");
    const discountAmount = assertValidNonNegativeDecimal(input.discountAmount ?? "0", "discountAmount");
    const taxRate = assertValidNonNegativeDecimal(input.taxRate ?? "0", "taxRate");

    const subtotal = subtractDecimal(multiplyDecimal(quantity, unitPrice), discountAmount);
    const tax = applyPercentage(subtotal, taxRate);
    const lineTotal = addDecimal(subtotal, tax);

    return new QuoteLine({
      id: input.id,
      tenantId: input.tenantId,
      quoteId: input.quoteId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      taxId: input.taxId,
      quantity,
      unitPrice,
      discountAmount,
      taxRate,
      lineTotal,
      createdAt: input.createdAt,
    });
  }

  /**
   * Reconstructs a line from storage, trusting the persisted `lineTotal`
   * as-is rather than recomputing it from the other fields (unlike most
   * entities in this codebase, which reuse `.create()` for both genuine
   * creation and reconstruction). `lineTotal` is a historical fact, not a
   * value that should silently change on read if a future rounding-rule
   * change would compute it slightly differently.
   */
  static fromProps(props: QuoteLineProps): QuoteLine {
    return new QuoteLine({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get quoteId(): string {
    return this.props.quoteId;
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
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<QuoteLineProps> {
    return { ...this.props };
  }
}
