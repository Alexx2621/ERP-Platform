import { QuoteLine } from "./quote-line.entity";

export interface QuoteLineRepository {
  findById(tenantId: string, id: string): Promise<QuoteLine | null>;
  listByQuote(tenantId: string, quoteId: string): Promise<QuoteLine[]>;
  save(line: QuoteLine): Promise<void>;
}

export const QUOTE_LINE_REPOSITORY = Symbol("QUOTE_LINE_REPOSITORY");
