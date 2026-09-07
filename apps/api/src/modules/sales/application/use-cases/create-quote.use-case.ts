import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import {
  DOCUMENT_NUMBER_ALLOCATOR,
  DocumentNumberAllocator,
} from "../../../../shared/document-numbering/document-number.port";
import { Quote, SalesChannel } from "../../domain/quote.entity";
import { QUOTE_REPOSITORY, QuoteRepository } from "../../domain/quote.repository";
import { ResolveCustomerTargetUseCase } from "./resolve-customer-target.use-case";

export const SALES_QUOTE_DOCUMENT_TYPE = "SALES_QUOTE";
export const SALES_QUOTE_NUMBER_PREFIX = "COT";

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
    @Inject(DOCUMENT_NUMBER_ALLOCATOR) private readonly documentNumbers: DocumentNumberAllocator,
  ) {}

  async execute(input: CreateQuoteInput): Promise<Quote> {
    await this.resolveCustomer.execute(input.tenantId, input.companyId, input.customerId);

    const number = await this.documentNumbers.allocate({
      tenantId: input.tenantId,
      companyId: input.companyId,
      documentType: SALES_QUOTE_DOCUMENT_TYPE,
      prefix: SALES_QUOTE_NUMBER_PREFIX,
    });

    const now = new Date();
    const quote = Quote.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: input.customerId,
      number,
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
