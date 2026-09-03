import { Injectable } from "@nestjs/common";
import type { BillOfMaterialComponent as PrismaBillOfMaterialComponent } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { BillOfMaterialComponent } from "../domain/bill-of-material-component.entity";
import { BillOfMaterialComponentRepository } from "../domain/bill-of-material-component.repository";

@Injectable()
export class PrismaBillOfMaterialComponentRepository implements BillOfMaterialComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByBillOfMaterial(tenantId: string, billOfMaterialId: string): Promise<BillOfMaterialComponent[]> {
    const records = await this.prisma.billOfMaterialComponent.findMany({
      where: { tenantId, billOfMaterialId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(component: BillOfMaterialComponent): Promise<void> {
    const props = component.toProps();
    await this.prisma.billOfMaterialComponent.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaBillOfMaterialComponent): BillOfMaterialComponent {
    return BillOfMaterialComponent.create({
      id: record.id,
      tenantId: record.tenantId,
      billOfMaterialId: record.billOfMaterialId,
      componentProductId: record.componentProductId,
      componentVariantId: record.componentVariantId,
      quantityPerUnit: record.quantityPerUnit.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
