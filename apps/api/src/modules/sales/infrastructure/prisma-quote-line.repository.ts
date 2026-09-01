import { Injectable } from "@nestjs/common";
import type { QuoteLine as PrismaQuoteLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { QuoteLine } from "../domain/quote-line.entity";
import { QuoteLineRepository } from "../domain/quote-line.repository";

@Injectable()
export class PrismaQuoteLineRepository implements QuoteLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<QuoteLine | null> {
    const record = await this.prisma.quoteLine.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByQuote(tenantId: string, quoteId: string): Promise<QuoteLine[]> {
    const records = await this.prisma.quoteLine.findMany({
      where: { tenantId, quoteId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: QuoteLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.quoteLine.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaQuoteLine): QuoteLine {
    return QuoteLine.fromProps({
      id: record.id,
      tenantId: record.tenantId,
      quoteId: record.quoteId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      taxId: record.taxId,
      // .toFixed(4), not .toString() — Decimal.js strips trailing zeros (the real bug already found and fixed once in Catalog, session 23).
      quantity: record.quantity.toFixed(4),
      unitPrice: record.unitPrice.toFixed(4),
      discountAmount: record.discountAmount.toFixed(4),
      taxRate: record.taxRate.toFixed(4),
      lineTotal: record.lineTotal.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
