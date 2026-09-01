import { Inject, Injectable } from "@nestjs/common";
import { Quote } from "../../domain/quote.entity";
import { ListQuotesFilter, QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";

export interface ListQuotesInput {
  tenantId: string;
  companyId: string;
  filter: ListQuotesFilter;
}

@Injectable()
export class ListQuotesUseCase {
  constructor(@Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository) {}

  async execute(input: ListQuotesInput): Promise<Quote[]> {
    return this.quotes.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
