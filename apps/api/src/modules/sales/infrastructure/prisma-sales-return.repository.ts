import { Injectable } from "@nestjs/common";
import type { SalesReturn as PrismaSalesReturn } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SalesReturn } from "../domain/sales-return.entity";
import { ListSalesReturnsFilter, SalesReturnRepository } from "../domain/sales-return.repository";

@Injectable()
export class PrismaSalesReturnRepository implements SalesReturnRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<SalesReturn | null> {
    const record = await this.prisma.salesReturn.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListSalesReturnsFilter): Promise<SalesReturn[]> {
    const records = await this.prisma.salesReturn.findMany({
      where: { tenantId, companyId, salesOrderId: filter.salesOrderId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(salesReturn: SalesReturn): Promise<void> {
    const props = salesReturn.toProps();
    await this.prisma.salesReturn.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaSalesReturn): SalesReturn {
    return SalesReturn.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      salesOrderId: record.salesOrderId,
      reason: record.reason,
      createdAt: record.createdAt,
    });
  }
}
