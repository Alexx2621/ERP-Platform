import { Injectable } from "@nestjs/common";
import type { SalesReturnLine as PrismaSalesReturnLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SalesReturnLine } from "../domain/sales-return-line.entity";
import { SalesReturnLineRepository } from "../domain/sales-return-line.repository";

@Injectable()
export class PrismaSalesReturnLineRepository implements SalesReturnLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listBySalesReturn(tenantId: string, salesReturnId: string): Promise<SalesReturnLine[]> {
    const records = await this.prisma.salesReturnLine.findMany({
      where: { tenantId, salesReturnId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listBySalesOrderLine(tenantId: string, salesOrderLineId: string): Promise<SalesReturnLine[]> {
    const records = await this.prisma.salesReturnLine.findMany({
      where: { tenantId, salesOrderLineId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: SalesReturnLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.salesReturnLine.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaSalesReturnLine): SalesReturnLine {
    return SalesReturnLine.create({
      id: record.id,
      tenantId: record.tenantId,
      salesReturnId: record.salesReturnId,
      salesOrderLineId: record.salesOrderLineId,
      quantity: record.quantity.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
