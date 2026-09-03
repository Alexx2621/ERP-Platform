import { ProductionOrder } from "./production-order.entity";

export interface ListProductionOrdersFilter {
  status?: string;
  billOfMaterialId?: string;
  limit?: number;
}

export interface ProductionOrderRepository {
  findById(tenantId: string, id: string): Promise<ProductionOrder | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListProductionOrdersFilter): Promise<ProductionOrder[]>;
  save(order: ProductionOrder): Promise<void>;
}

export const PRODUCTION_ORDER_REPOSITORY = Symbol("PRODUCTION_ORDER_REPOSITORY");
