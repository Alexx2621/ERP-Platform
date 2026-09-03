import { Injectable } from "@nestjs/common";
import type { ProductionOrderMaterial as PrismaProductionOrderMaterial } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductionOrderMaterial } from "../domain/production-order-material.entity";
import { ProductionOrderMaterialRepository } from "../domain/production-order-material.repository";

@Injectable()
export class PrismaProductionOrderMaterialRepository implements ProductionOrderMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<ProductionOrderMaterial | null> {
    const record = await this.prisma.productionOrderMaterial.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderMaterial[]> {
    const records = await this.prisma.productionOrderMaterial.findMany({
      where: { tenantId, productionOrderId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(material: ProductionOrderMaterial): Promise<void> {
    const props = material.toProps();
    await this.prisma.productionOrderMaterial.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaProductionOrderMaterial): ProductionOrderMaterial {
    return ProductionOrderMaterial.create({
      id: record.id,
      tenantId: record.tenantId,
      productionOrderId: record.productionOrderId,
      componentProductId: record.componentProductId,
      componentVariantId: record.componentVariantId,
      quantityRequired: record.quantityRequired.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
