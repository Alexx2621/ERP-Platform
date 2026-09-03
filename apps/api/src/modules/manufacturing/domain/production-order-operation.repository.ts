import { ProductionOrderOperation } from "./production-order-operation.entity";

export interface ProductionOrderOperationRepository {
  findById(tenantId: string, id: string): Promise<ProductionOrderOperation | null>;
  listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderOperation[]>;
  save(operation: ProductionOrderOperation): Promise<void>;
}

export const PRODUCTION_ORDER_OPERATION_REPOSITORY = Symbol("PRODUCTION_ORDER_OPERATION_REPOSITORY");
