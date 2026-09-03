import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RecordIssueUseCase } from "../../../inventory";
import { addDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { ProductionOrderMaterialMovement } from "../../domain/production-order-material-movement.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_MATERIAL_REPOSITORY,
  ProductionOrderMaterialRepository,
} from "../../domain/production-order-material.repository";
import {
  PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY,
  ProductionOrderMaterialMovementRepository,
} from "../../domain/production-order-material-movement.repository";
import {
  ProductionOrderMaterialIssueExceedsRequiredQuantityError,
  ProductionOrderMaterialNotFoundError,
  ProductionOrderNotConfirmedError,
  ProductionOrderNotFoundError,
} from "../errors";

export interface IssueProductionOrderMaterialInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  productionOrderId: string;
  productionOrderMaterialId: string;
  quantity: string;
}

/**
 * The "issue/consume" `docs/ROADMAP.md` §14 requires, genuinely partial
 * across multiple calls — each issue is validated against the running net
 * (issued minus returned) for the same material, computed by reading
 * `ProductionOrderMaterialMovementRepository`, never a stored counter
 * (same pattern `CreatePurchaseReceiptUseCase` already established for
 * "received so far"). Posts a real `RecordIssueUseCase` call
 * (`referenceType: "PRODUCTION_ORDER"`) in the same call that records the
 * local movement row.
 */
@Injectable()
export class IssueProductionOrderMaterialUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_REPOSITORY)
    private readonly materials: ProductionOrderMaterialRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY)
    private readonly movements: ProductionOrderMaterialMovementRepository,
    private readonly recordIssue: RecordIssueUseCase,
  ) {}

  async execute(input: IssueProductionOrderMaterialInput): Promise<ProductionOrderMaterialMovement> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new ProductionOrderNotConfirmedError();
    }

    const material = await this.materials.findById(input.tenantId, input.productionOrderMaterialId);
    if (!material || material.productionOrderId !== order.id) {
      throw new ProductionOrderMaterialNotFoundError();
    }

    const priorMovements = await this.movements.listByProductionOrderMaterial(input.tenantId, material.id);
    const netIssued = priorMovements.reduce(
      (sum, movement) =>
        movement.type === "ISSUE" ? addDecimal(sum, movement.quantity) : subtractDecimal(sum, movement.quantity),
      "0.0000",
    );

    const now = new Date();
    const movement = ProductionOrderMaterialMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      productionOrderMaterialId: material.id,
      type: "ISSUE",
      quantity: input.quantity,
      createdAt: now,
    });
    const remaining = subtractDecimal(material.quantityRequired, addDecimal(netIssued, movement.quantity));
    if (isNegativeDecimal(remaining)) {
      throw new ProductionOrderMaterialIssueExceedsRequiredQuantityError();
    }

    await this.recordIssue.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      warehouseId: order.warehouseId,
      productId: material.componentProductId,
      productVariantId: material.componentVariantId,
      quantity: movement.quantity,
      referenceType: "PRODUCTION_ORDER",
      referenceId: order.id,
    });

    await this.movements.save(movement);
    return movement;
  }
}
