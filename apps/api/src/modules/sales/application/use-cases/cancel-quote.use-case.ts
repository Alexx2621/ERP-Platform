import { Inject, Injectable } from "@nestjs/common";
import { Quote } from "../../domain/quote.entity";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { QuoteNotFoundError } from "../errors";

export interface CancelQuoteInput {
  tenantId: string;
  companyId: string;
  quoteId: string;
}

@Injectable()
export class CancelQuoteUseCase {
  constructor(@Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository) {}

  async execute(input: CancelQuoteInput): Promise<Quote> {
    const quote = await this.quotes.findById(input.tenantId, input.quoteId);
    if (!quote || quote.companyId !== input.companyId) {
      throw new QuoteNotFoundError();
    }
    quote.cancel(new Date());
    await this.quotes.save(quote);
    return quote;
  }
}
