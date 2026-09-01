import { Injectable } from "@nestjs/common";
import type { Quote as PrismaQuote } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Quote } from "../domain/quote.entity";
import { ListQuotesFilter, QuoteRepository } from "../domain/quote.repository";

@Injectable()
export class PrismaQuoteRepository implements QuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Quote | null> {
    const record = await this.prisma.quote.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListQuotesFilter): Promise<Quote[]> {
    const records = await this.prisma.quote.findMany({
      where: { tenantId, companyId, status: filter.status, customerId: filter.customerId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(quote: Quote): Promise<void> {
    const props = quote.toProps();
    await this.prisma.quote.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        status: props.status,
        notes: props.notes,
        version: props.version,
        convertedAt: props.convertedAt,
        cancelledAt: props.cancelledAt,
      },
    });
  }

  private toDomain(record: PrismaQuote): Quote {
    return Quote.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      customerId: record.customerId,
      channel: record.channel,
      status: record.status,
      currency: record.currency,
      notes: record.notes,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      convertedAt: record.convertedAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
