import { ProductionOrderMaterial } from "../domain/production-order-material.entity";
import { ProductionOrderMaterialRepository } from "../domain/production-order-material.repository";

export class InMemoryProductionOrderMaterialRepository implements ProductionOrderMaterialRepository {
  private readonly byId = new Map<string, ProductionOrderMaterial>();

  async findById(tenantId: string, id: string): Promise<ProductionOrderMaterial | null> {
    const material = this.byId.get(id);
    return material && material.tenantId === tenantId ? material : null;
  }

  async listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderMaterial[]> {
    return [...this.byId.values()]
      .filter((m) => m.tenantId === tenantId && m.productionOrderId === productionOrderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(material: ProductionOrderMaterial): Promise<void> {
    this.byId.set(material.id, material);
  }
}
