import { Injectable } from "@nestjs/common";
import { Prisma, type SalesOrderLine as PrismaSalesOrderLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SalesOrderLine } from "../domain/sales-order-line.entity";
import { SalesOrderLineRepository } from "../domain/sales-order-line.repository";

/** `groupBy._sum` is null for a group with no rows; it cannot happen for a
 * group that exists, but the type is nullable, so this is the explicit zero. */
const ZERO = new Prisma.Decimal(0);

@Injectable()
export class PrismaSalesOrderLineRepository implements SalesOrderLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<SalesOrderLine | null> {
    const record = await this.prisma.salesOrderLine.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listBySalesOrder(tenantId: string, salesOrderId: string): Promise<SalesOrderLine[]> {
    const records = await this.prisma.salesOrderLine.findMany({
      where: { tenantId, salesOrderId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: SalesOrderLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.salesOrderLine.upsert({
      where: { id: props.id },
      create: props,
      update: { reservationId: props.reservationId },
    });
  }

  async sumTotalsByOrders(tenantId: string, salesOrderIds: string[]): Promise<Map<string, string>> {
    if (salesOrderIds.length === 0) return new Map();
    const rows = await this.prisma.salesOrderLine.groupBy({
      by: ["salesOrderId"],
      where: { tenantId, salesOrderId: { in: salesOrderIds } },
      _sum: { lineTotal: true },
    });
    return new Map(rows.map((row) => [row.salesOrderId, (row._sum.lineTotal ?? ZERO).toFixed(4)]));
  }

  async topProductTotals(
    tenantId: string,
    salesOrderIds: string[],
    limit: number,
  ): Promise<Array<{ productId: string; quantity: string; revenue: string }>> {
    if (salesOrderIds.length === 0) return [];
    const rows = await this.prisma.salesOrderLine.groupBy({
      by: ["productId"],
      where: { tenantId, salesOrderId: { in: salesOrderIds } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: limit,
    });
    return rows.map((row) => ({
      productId: row.productId,
      quantity: (row._sum.quantity ?? ZERO).toFixed(4),
      revenue: (row._sum.lineTotal ?? ZERO).toFixed(4),
    }));
  }

  private toDomain(record: PrismaSalesOrderLine): SalesOrderLine {
    return SalesOrderLine.fromProps({
      id: record.id,
      tenantId: record.tenantId,
      salesOrderId: record.salesOrderId,
      warehouseId: record.warehouseId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      taxId: record.taxId,
      quantity: record.quantity.toFixed(4),
      unitPrice: record.unitPrice.toFixed(4),
      discountAmount: record.discountAmount.toFixed(4),
      taxRate: record.taxRate.toFixed(4),
      lineTotal: record.lineTotal.toFixed(4),
      reservationId: record.reservationId,
      createdAt: record.createdAt,
    });
  }
}
