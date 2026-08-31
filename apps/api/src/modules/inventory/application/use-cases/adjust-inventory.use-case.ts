import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { assertValidPositiveDecimal, negateDecimal } from "../../domain/decimal";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryBalance } from "../../domain/inventory-balance.entity";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export type InventoryAdjustmentDirection = "INCREASE" | "DECREASE";

export interface AdjustInventoryInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  warehouseId: string;
  productId: string;
  productVariantId?: string | null;
  direction: InventoryAdjustmentDirection;
  /** Positive magnitude of the correction; sign is derived from `direction`. */
  quantity: string;
  reason: string;
}

/**
 * A manual correction to on-hand stock (a physical count found a
 * discrepancy, damaged goods written off, etc. — MASTER_SPEC §10/§20).
 * Takes an explicit `direction` + positive magnitude rather than a raw
 * signed decimal string, since that is what a correction form actually
 * collects from a user; `reason` is mandatory (enforced again by
 * `InventoryMovement.create`, which requires it for every ADJUSTMENT row).
 */
@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(input: AdjustInventoryInput): Promise<{ movement: InventoryMovement; balance: InventoryBalance }> {
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.warehouseId);
    const productVariantId = await this.resolveProduct.execute(
      input.tenantId,
      input.companyId,
      input.productId,
      input.productVariantId,
    );
    const positiveQuantity = assertValidPositiveDecimal(input.quantity, "quantity");
    const reason = input.reason?.trim();
    if (!reason) {
      throw new Error("An adjustment requires a reason.");
    }

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId,
      type: "ADJUSTMENT",
      quantity: input.direction === "DECREASE" ? negateDecimal(positiveQuantity) : positiveQuantity,
      reason,
      referenceType: "MANUAL",
      referenceId: null,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: new Date(),
    });

    const balance = await this.balances.applyMovement(movement);
    return { movement, balance };
  }
}
