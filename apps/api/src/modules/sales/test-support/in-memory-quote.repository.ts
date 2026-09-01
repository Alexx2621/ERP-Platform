import { Quote } from "../domain/quote.entity";
import { ListQuotesFilter, QuoteRepository } from "../domain/quote.repository";

export class InMemoryQuoteRepository implements QuoteRepository {
  private readonly byId = new Map<string, Quote>();

  async findById(tenantId: string, id: string): Promise<Quote | null> {
    const quote = this.byId.get(id);
    return quote && quote.tenantId === tenantId ? quote : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListQuotesFilter): Promise<Quote[]> {
    return [...this.byId.values()]
      .filter(
        (q) =>
          q.tenantId === tenantId &&
          q.companyId === companyId &&
          (filter.status === undefined || q.status === filter.status) &&
          (filter.customerId === undefined || q.customerId === filter.customerId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(quote: Quote): Promise<void> {
    this.byId.set(quote.id, quote);
  }
}
