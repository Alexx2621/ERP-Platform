import { Inject, Injectable } from "@nestjs/common";
import { addDecimal, subtractDecimal } from "../../domain/decimal";
import { ProductionOrderMaterial } from "../../domain/production-order-material.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_MATERIAL_REPOSITORY,
  ProductionOrderMaterialRepository,
} from "../../domain/production-order-material.repository";
import {
  PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY,
  ProductionOrderMaterialMovementRepository,
} from "../../domain/production-order-material-movement.repository";
import { ProductionOrderNotFoundError } from "../errors";

export interface ListProductionOrderMaterialsInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

export interface ProductionOrderMaterialSummary {
  material: ProductionOrderMaterial;
  /** issued − returned, summed fresh from `ProductionOrderMaterialMovement` on every call — never a stored counter. */
  quantityIssuedNet: string;
}

@Injectable()
export class ListProductionOrderMaterialsUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_REPOSITORY)
    private readonly materials: ProductionOrderMaterialRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY)
    private readonly movements: ProductionOrderMaterialMovementRepository,
  ) {}

  async execute(input: ListProductionOrderMaterialsInput): Promise<ProductionOrderMaterialSummary[]> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }

    const materials = await this.materials.listByProductionOrder(input.tenantId, order.id);
    const summaries: ProductionOrderMaterialSummary[] = [];
    for (const material of materials) {
      const materialMovements = await this.movements.listByProductionOrderMaterial(input.tenantId, material.id);
      const quantityIssuedNet = materialMovements.reduce(
        (sum, movement) =>
          movement.type === "ISSUE" ? addDecimal(sum, movement.quantity) : subtractDecimal(sum, movement.quantity),
        "0.0000",
      );
      summaries.push({ material, quantityIssuedNet });
    }
    return summaries;
  }
}
