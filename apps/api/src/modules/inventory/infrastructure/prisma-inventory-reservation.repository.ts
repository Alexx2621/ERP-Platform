import { Injectable } from "@nestjs/common";
import type { InventoryReservation as PrismaInventoryReservation } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryReservation } from "../domain/inventory-reservation.entity";
import {
  InventoryReservationRepository,
  ListInventoryReservationsFilter,
} from "../domain/inventory-reservation.repository";

@Injectable()
export class PrismaInventoryReservationRepository implements InventoryReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<InventoryReservation | null> {
    const record = await this.prisma.inventoryReservation.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryReservationsFilter,
  ): Promise<InventoryReservation[]> {
    const records = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        companyId,
        warehouseId: filter.warehouseId,
        productId: filter.productId,
        status: filter.status,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(reservation: InventoryReservation): Promise<void> {
    const props = reservation.toProps();
    await this.prisma.inventoryReservation.upsert({
      where: { id: props.id },
      create: props,
      update: { status: props.status, version: props.version, releasedAt: props.releasedAt },
    });
  }

  private toDomain(record: PrismaInventoryReservation): InventoryReservation {
    return InventoryReservation.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      warehouseId: record.warehouseId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      quantity: record.quantity.toFixed(4),
      status: record.status,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      version: record.version,
      createdAt: record.createdAt,
      releasedAt: record.releasedAt,
    });
  }
}
