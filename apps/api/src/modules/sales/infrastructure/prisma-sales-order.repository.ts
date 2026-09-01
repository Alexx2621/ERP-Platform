import { Injectable } from "@nestjs/common";
import type { SalesOrder as PrismaSalesOrder } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SalesOrder } from "../domain/sales-order.entity";
import { ListSalesOrdersFilter, SalesOrderRepository } from "../domain/sales-order.repository";

@Injectable()
export class PrismaSalesOrderRepository implements SalesOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<SalesOrder | null> {
    const record = await this.prisma.salesOrder.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListSalesOrdersFilter): Promise<SalesOrder[]> {
    const records = await this.prisma.salesOrder.findMany({
      where: { tenantId, companyId, status: filter.status, customerId: filter.customerId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(order: SalesOrder): Promise<void> {
    const props = order.toProps();
    await this.prisma.salesOrder.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        status: props.status,
        version: props.version,
        confirmedAt: props.confirmedAt,
        fulfilledAt: props.fulfilledAt,
        cancelledAt: props.cancelledAt,
      },
    });
  }

  private toDomain(record: PrismaSalesOrder): SalesOrder {
    return SalesOrder.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      customerId: record.customerId,
      quoteId: record.quoteId,
      channel: record.channel,
      status: record.status,
      currency: record.currency,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      confirmedAt: record.confirmedAt,
      fulfilledAt: record.fulfilledAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
