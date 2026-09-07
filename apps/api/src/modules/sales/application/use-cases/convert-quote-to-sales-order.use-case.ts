import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetProductUseCase } from "../../../catalog";
import {
  DOCUMENT_NUMBER_ALLOCATOR,
  DocumentNumberAllocator,
} from "../../../../shared/document-numbering/document-number.port";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SalesOrderLine } from "../../domain/sales-order-line.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { QUOTE_LINE_REPOSITORY, QuoteLineRepository } from "../../domain/quote-line.repository";
import { ProductNotFoundError, QuoteHasNoLinesError, QuoteNotDraftError, QuoteNotFoundError } from "../errors";
import { SALES_ORDER_DOCUMENT_TYPE, SALES_ORDER_NUMBER_PREFIX } from "./create-sales-order.use-case";

export interface ConvertQuoteToSalesOrderInput {
  tenantId: string;
  companyId: string;
  quoteId: string;
  /**
   * Applied to every converted line whose product tracks inventory (a
   * quote itself never records a warehouse — see `Quote`'s docstring).
   * Deliberately a single warehouse for the whole order in this slice, not
   * a per-line assignment — the common real case (one order ships from one
   * dominant warehouse); per-line assignment is a natural, additive
   * extension once a real use case demands it.
   */
  warehouseId?: string | null;
}

/**
 * Copies each QuoteLine's already-computed pricing snapshot verbatim into
 * a new SalesOrderLine — never recomputed from live Catalog/Pricing data,
 * preserving exactly what the customer was quoted.
 */
@Injectable()
export class ConvertQuoteToSalesOrderUseCase {
  constructor(
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    @Inject(QUOTE_LINE_REPOSITORY) private readonly quoteLines: QuoteLineRepository,
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly salesOrderLines: SalesOrderLineRepository,
    private readonly getProduct: GetProductUseCase,
    @Inject(DOCUMENT_NUMBER_ALLOCATOR) private readonly documentNumbers: DocumentNumberAllocator,
  ) {}

  async execute(input: ConvertQuoteToSalesOrderInput): Promise<SalesOrder> {
    const quote = await this.quotes.findById(input.tenantId, input.quoteId);
    if (!quote || quote.companyId !== input.companyId) {
      throw new QuoteNotFoundError();
    }
    if (quote.status !== "DRAFT") {
      throw new QuoteNotDraftError();
    }

    const lines = await this.quoteLines.listByQuote(input.tenantId, quote.id);
    if (lines.length === 0) {
      throw new QuoteHasNoLinesError();
    }

    const number = await this.documentNumbers.allocate({
      tenantId: input.tenantId,
      companyId: input.companyId,
      documentType: SALES_ORDER_DOCUMENT_TYPE,
      prefix: SALES_ORDER_NUMBER_PREFIX,
    });

    const now = new Date();
    const order = SalesOrder.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      number,
      channel: quote.channel,
      status: "DRAFT",
      currency: quote.currency,
      version: 1,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    await this.salesOrders.save(order);

    for (const quoteLine of lines) {
      const product = await this.getProduct.execute(input.tenantId, quoteLine.productId);
      if (!product || product.companyId !== input.companyId) {
        throw new ProductNotFoundError();
      }
      const orderLine = SalesOrderLine.fromProps({
        id: newId(),
        tenantId: input.tenantId,
        salesOrderId: order.id,
        warehouseId: product.trackInventory ? (input.warehouseId ?? null) : null,
        productId: quoteLine.productId,
        productVariantId: quoteLine.productVariantId,
        taxId: quoteLine.taxId,
        quantity: quoteLine.quantity,
        unitPrice: quoteLine.unitPrice,
        discountAmount: quoteLine.discountAmount,
        taxRate: quoteLine.taxRate,
        lineTotal: quoteLine.lineTotal,
        reservationId: null,
        createdAt: now,
      });
      await this.salesOrderLines.save(orderLine);
    }

    quote.convert(now);
    await this.quotes.save(quote);

    return order;
  }
}
