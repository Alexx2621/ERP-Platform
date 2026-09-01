import { Injectable } from "@nestjs/common";
import type { SalesOrderLine as PrismaSalesOrderLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SalesOrderLine } from "../domain/sales-order-line.entity";
import { SalesOrderLineRepository } from "../domain/sales-order-line.repository";

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
