import { Injectable } from "@nestjs/common";
import type { InventoryTransfer as PrismaInventoryTransfer } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryTransfer } from "../domain/inventory-transfer.entity";
import { InventoryTransferRepository, ListInventoryTransfersFilter } from "../domain/inventory-transfer.repository";

@Injectable()
export class PrismaInventoryTransferRepository implements InventoryTransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<InventoryTransfer | null> {
    const record = await this.prisma.inventoryTransfer.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryTransfersFilter,
  ): Promise<InventoryTransfer[]> {
    const records = await this.prisma.inventoryTransfer.findMany({
      where: {
        tenantId,
        companyId,
        status: filter.status,
        productId: filter.productId,
        ...(filter.warehouseId
          ? { OR: [{ sourceWarehouseId: filter.warehouseId }, { destinationWarehouseId: filter.warehouseId }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(transfer: InventoryTransfer): Promise<void> {
    const props = transfer.toProps();
    await this.prisma.inventoryTransfer.upsert({
      where: { id: props.id },
      create: props,
      update: {
        status: props.status,
        version: props.version,
        completedAt: props.completedAt,
        cancelledAt: props.cancelledAt,
      },
    });
  }

  private toDomain(record: PrismaInventoryTransfer): InventoryTransfer {
    return InventoryTransfer.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      sourceWarehouseId: record.sourceWarehouseId,
      destinationWarehouseId: record.destinationWarehouseId,
      quantity: record.quantity.toFixed(4),
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
