import { ProductionOrderOperation } from "../domain/production-order-operation.entity";
import { ProductionOrderOperationRepository } from "../domain/production-order-operation.repository";

export class InMemoryProductionOrderOperationRepository implements ProductionOrderOperationRepository {
  private readonly byId = new Map<string, ProductionOrderOperation>();

  async findById(tenantId: string, id: string): Promise<ProductionOrderOperation | null> {
    const operation = this.byId.get(id);
    return operation && operation.tenantId === tenantId ? operation : null;
  }

  async listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderOperation[]> {
    return [...this.byId.values()]
      .filter((o) => o.tenantId === tenantId && o.productionOrderId === productionOrderId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async save(operation: ProductionOrderOperation): Promise<void> {
    this.byId.set(operation.id, operation);
  }
}
