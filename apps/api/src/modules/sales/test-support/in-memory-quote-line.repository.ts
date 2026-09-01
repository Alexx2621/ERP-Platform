import { QuoteLine } from "../domain/quote-line.entity";
import { QuoteLineRepository } from "../domain/quote-line.repository";

export class InMemoryQuoteLineRepository implements QuoteLineRepository {
  private readonly byId = new Map<string, QuoteLine>();

  async findById(tenantId: string, id: string): Promise<QuoteLine | null> {
    const line = this.byId.get(id);
    return line && line.tenantId === tenantId ? line : null;
  }

  async listByQuote(tenantId: string, quoteId: string): Promise<QuoteLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.quoteId === quoteId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: QuoteLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
