import { ProductionOrderMaterial } from "./production-order-material.entity";

export interface ProductionOrderMaterialRepository {
  findById(tenantId: string, id: string): Promise<ProductionOrderMaterial | null>;
  listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderMaterial[]>;
  save(material: ProductionOrderMaterial): Promise<void>;
}

export const PRODUCTION_ORDER_MATERIAL_REPOSITORY = Symbol("PRODUCTION_ORDER_MATERIAL_REPOSITORY");
