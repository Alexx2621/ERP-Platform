import { Injectable } from "@nestjs/common";
import type { InventoryMovement as PrismaInventoryMovement } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryMovement } from "../domain/inventory-movement.entity";
import { InventoryMovementRepository, ListInventoryMovementsFilter } from "../domain/inventory-movement.repository";

@Injectable()
export class PrismaInventoryMovementRepository implements InventoryMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryMovementsFilter,
  ): Promise<InventoryMovement[]> {
    const records = await this.prisma.inventoryMovement.findMany({
      where: {
        tenantId,
        companyId,
        warehouseId: filter.warehouseId,
        productId: filter.productId,
        productVariantId: filter.productVariantId,
        referenceType: filter.referenceType,
        referenceId: filter.referenceId,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaInventoryMovement): InventoryMovement {
    return InventoryMovement.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      warehouseId: record.warehouseId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      type: record.type,
      // .toFixed(4), not .toString() — Decimal.js strips trailing zeros
      // (the real bug already found and fixed once in Catalog, session 23).
      quantity: record.quantity.toFixed(4),
      reason: record.reason,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      correlationId: record.correlationId,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt,
    });
  }
}
