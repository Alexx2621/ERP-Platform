import { ProductionOrderMaterialMovement } from "../domain/production-order-material-movement.entity";
import { ProductionOrderMaterialMovementRepository } from "../domain/production-order-material-movement.repository";

export class InMemoryProductionOrderMaterialMovementRepository implements ProductionOrderMaterialMovementRepository {
  private readonly byId = new Map<string, ProductionOrderMaterialMovement>();

  async listByProductionOrderMaterial(
    tenantId: string,
    productionOrderMaterialId: string,
  ): Promise<ProductionOrderMaterialMovement[]> {
    return [...this.byId.values()]
      .filter((m) => m.tenantId === tenantId && m.productionOrderMaterialId === productionOrderMaterialId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(movement: ProductionOrderMaterialMovement): Promise<void> {
    this.byId.set(movement.id, movement);
  }
}
