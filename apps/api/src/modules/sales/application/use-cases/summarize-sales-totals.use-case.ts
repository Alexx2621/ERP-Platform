import { Inject, Injectable } from "@nestjs/common";
import { QUOTE_LINE_REPOSITORY, QuoteLineRepository } from "../../domain/quote-line.repository";
import {
  SALES_ORDER_LINE_REPOSITORY,
  SalesOrderLineRepository,
} from "../../domain/sales-order-line.repository";

/**
 * Aggregates document totals from their own lines, in one query per call.
 *
 * A document's total is never stored on the document row — it is always the
 * sum of its lines, the same "read the ledger, never a stored counter" rule
 * `InventoryBalance`, Accounting's Trial Balance and Manufacturing's
 * `quantityCompleted` already follow. This use case exists so a list screen
 * can show a total column without issuing one line query per row.
 *
 * A document with no lines is absent from the returned map; callers render
 * that as `"0.0000"`, which is the honest total of an empty document.
 */
@Injectable()
export class SummarizeSalesTotalsUseCase {
  constructor(
    @Inject(QUOTE_LINE_REPOSITORY) private readonly quoteLines: QuoteLineRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly salesOrderLines: SalesOrderLineRepository,
  ) {}

  async forQuotes(tenantId: string, quoteIds: string[]): Promise<Map<string, string>> {
    return this.quoteLines.sumTotalsByQuotes(tenantId, quoteIds);
  }

  async forSalesOrders(tenantId: string, salesOrderIds: string[]): Promise<Map<string, string>> {
    return this.salesOrderLines.sumTotalsByOrders(tenantId, salesOrderIds);
  }
}
