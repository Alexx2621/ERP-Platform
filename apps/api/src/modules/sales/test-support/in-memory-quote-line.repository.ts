import { QuoteLine } from "../domain/quote-line.entity";
import { addDecimal } from "../domain/decimal";
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

  async sumTotalsByQuotes(tenantId: string, quoteIds: string[]): Promise<Map<string, string>> {
    const totals = new Map<string, string>();
    for (const line of this.byId.values()) {
      if (line.tenantId !== tenantId || !quoteIds.includes(line.quoteId)) continue;
      totals.set(line.quoteId, addDecimal(totals.get(line.quoteId) ?? "0", line.lineTotal));
    }
    return totals;
  }

  async save(line: QuoteLine): Promise<void> {
    this.byId.set(line.id, line);
  }
}
