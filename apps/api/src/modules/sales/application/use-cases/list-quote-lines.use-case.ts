import { Inject, Injectable } from "@nestjs/common";
import { QuoteLine } from "../../domain/quote-line.entity";
import { QUOTE_LINE_REPOSITORY, QuoteLineRepository } from "../../domain/quote-line.repository";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { QuoteNotFoundError } from "../errors";

export interface ListQuoteLinesInput {
  tenantId: string;
  companyId: string;
  quoteId: string;
}

@Injectable()
export class ListQuoteLinesUseCase {
  constructor(
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    @Inject(QUOTE_LINE_REPOSITORY) private readonly lines: QuoteLineRepository,
  ) {}

  async execute(input: ListQuoteLinesInput): Promise<QuoteLine[]> {
    const quote = await this.quotes.findById(input.tenantId, input.quoteId);
    if (!quote || quote.companyId !== input.companyId) {
      throw new QuoteNotFoundError();
    }
    return this.lines.listByQuote(input.tenantId, quote.id);
  }
}
