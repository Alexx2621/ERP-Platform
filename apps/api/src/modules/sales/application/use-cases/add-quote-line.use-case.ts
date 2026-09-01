import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetPriceListItemUseCase } from "../../../pricing";
import { QuoteLine } from "../../domain/quote-line.entity";
import { QUOTE_LINE_REPOSITORY, QuoteLineRepository } from "../../domain/quote-line.repository";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { QuoteNotDraftError, QuoteNotFoundError } from "../errors";
import { ResolveSalesLineTargetUseCase } from "./resolve-sales-line-target.use-case";

export interface AddQuoteLineInput {
  tenantId: string;
  companyId: string;
  quoteId: string;
  productId: string;
  productVariantId?: string | null;
  taxId?: string | null;
  /** A specific price list to snapshot from, when the product has no variants (Pricing's own scope, see docs/SECURITY.md "Pricing"). */
  priceListId?: string | null;
  quantity: string;
  /** Overrides the resolved default (variant price, product basePrice, or price-list price). */
  unitPrice?: string;
  discountAmount?: string;
}

/**
 * Resolves the line's unit price with a clear precedence: an explicit
 * `unitPrice` always wins; otherwise a `priceListId` snapshot (non-variant
 * products only, via Pricing's own `GetPriceListItemUseCase`); otherwise
 * the product/variant's own base price. `assertValidNonNegativeDecimal`
 * inside `QuoteLine.create` rejects the case where none of the three
 * resolve to a real value.
 */
@Injectable()
export class AddQuoteLineUseCase {
  constructor(
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    @Inject(QUOTE_LINE_REPOSITORY) private readonly lines: QuoteLineRepository,
    private readonly resolveTarget: ResolveSalesLineTargetUseCase,
    private readonly getPriceListItem: GetPriceListItemUseCase,
  ) {}

  async execute(input: AddQuoteLineInput): Promise<QuoteLine> {
    const quote = await this.quotes.findById(input.tenantId, input.quoteId);
    if (!quote || quote.companyId !== input.companyId) {
      throw new QuoteNotFoundError();
    }
    if (quote.status !== "DRAFT") {
      throw new QuoteNotDraftError();
    }

    const resolved = await this.resolveTarget.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      taxId: input.taxId,
      requireWarehouse: false,
    });

    let unitPrice = input.unitPrice ?? null;
    if (!unitPrice && !resolved.productVariantId && input.priceListId) {
      const priceListItem = await this.getPriceListItem.execute(input.tenantId, input.priceListId, input.productId);
      if (priceListItem) {
        unitPrice = priceListItem.price;
      }
    }
    unitPrice = unitPrice ?? resolved.defaultUnitPrice ?? "";

    const line = QuoteLine.create({
      id: newId(),
      tenantId: input.tenantId,
      quoteId: quote.id,
      productId: input.productId,
      productVariantId: resolved.productVariantId,
      taxId: input.taxId ?? null,
      quantity: input.quantity,
      unitPrice,
      discountAmount: input.discountAmount,
      taxRate: resolved.taxRate,
      createdAt: new Date(),
    });
    await this.lines.save(line);
    return line;
  }
}
