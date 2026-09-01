import { Quote, QuoteStatus } from "./quote.entity";

export interface ListQuotesFilter {
  status?: QuoteStatus;
  customerId?: string;
  limit: number;
}

export interface QuoteRepository {
  findById(tenantId: string, id: string): Promise<Quote | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListQuotesFilter): Promise<Quote[]>;
  save(quote: Quote): Promise<void>;
}

export const QUOTE_REPOSITORY = Symbol("QUOTE_REPOSITORY");
