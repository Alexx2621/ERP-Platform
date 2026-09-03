import { Injectable } from "@nestjs/common";
import type { ProductionOrderMaterialMovement as PrismaProductionOrderMaterialMovement } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductionOrderMaterialMovement } from "../domain/production-order-material-movement.entity";
import { ProductionOrderMaterialMovementRepository } from "../domain/production-order-material-movement.repository";

@Injectable()
export class PrismaProductionOrderMaterialMovementRepository implements ProductionOrderMaterialMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByProductionOrderMaterial(
    tenantId: string,
    productionOrderMaterialId: string,
  ): Promise<ProductionOrderMaterialMovement[]> {
    const records = await this.prisma.productionOrderMaterialMovement.findMany({
      where: { tenantId, productionOrderMaterialId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(movement: ProductionOrderMaterialMovement): Promise<void> {
    const props = movement.toProps();
    await this.prisma.productionOrderMaterialMovement.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaProductionOrderMaterialMovement): ProductionOrderMaterialMovement {
    return ProductionOrderMaterialMovement.create({
      id: record.id,
      tenantId: record.tenantId,
      productionOrderMaterialId: record.productionOrderMaterialId,
      type: record.type,
      quantity: record.quantity.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
