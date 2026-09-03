import { ProductionOrderMaterialMovement } from "./production-order-material-movement.entity";

export interface ProductionOrderMaterialMovementRepository {
  listByProductionOrderMaterial(
    tenantId: string,
    productionOrderMaterialId: string,
  ): Promise<ProductionOrderMaterialMovement[]>;
  save(movement: ProductionOrderMaterialMovement): Promise<void>;
}

export const PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY = Symbol("PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY");
