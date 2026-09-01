import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Quote, SalesChannel } from "../../domain/quote.entity";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { ResolveCustomerTargetUseCase } from "./resolve-customer-target.use-case";

export interface CreateQuoteInput {
  tenantId: string;
  companyId: string;
  customerId: string;
  channel?: SalesChannel;
  currency: string;
  notes?: string | null;
}

@Injectable()
export class CreateQuoteUseCase {
  constructor(
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    private readonly resolveCustomer: ResolveCustomerTargetUseCase,
  ) {}

  async execute(input: CreateQuoteInput): Promise<Quote> {
    await this.resolveCustomer.execute(input.tenantId, input.companyId, input.customerId);

    const now = new Date();
    const quote = Quote.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: input.customerId,
      channel: input.channel ?? "ERP",
      status: "DRAFT",
      currency: input.currency,
      notes: input.notes ?? null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      convertedAt: null,
      cancelledAt: null,
    });
    await this.quotes.save(quote);
    return quote;
  }
}
