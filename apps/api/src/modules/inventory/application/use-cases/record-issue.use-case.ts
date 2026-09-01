import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { assertValidPositiveDecimal, negateDecimal } from "../../domain/decimal";
import { InventoryMovement, InventoryMovementReferenceType } from "../../domain/inventory-movement.entity";
import { InventoryBalance } from "../../domain/inventory-balance.entity";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export interface RecordIssueInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  warehouseId: string;
  productId: string;
  productVariantId?: string | null;
  /** Positive amount to remove from on-hand stock — negated internally before it reaches the ledger. */
  quantity: string;
  reason?: string | null;
  /** Omitted → MANUAL (a direct UI-driven issue). Sales passes SALES_ORDER + its order id on fulfillment. */
  referenceType?: InventoryMovementReferenceType;
  referenceId?: string | null;
}

/**
 * Stock leaving a warehouse with no corresponding InventoryTransfer — a
 * manual write-off/sample (`referenceType: "MANUAL"`, the default) or,
 * since Sales (Phase 4), a real order fulfillment
 * (`referenceType: "SALES_ORDER"`, `referenceId: salesOrderId` — see
 * `FulfillSalesOrderUseCase`). Rejected by
 * `InventoryBalanceRepository.applyMovement` with `InsufficientInventoryError`
 * if it would drive on-hand below the already-reserved quantity.
 */
@Injectable()
export class RecordIssueUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(input: RecordIssueInput): Promise<{ movement: InventoryMovement; balance: InventoryBalance }> {
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.warehouseId);
    const productVariantId = await this.resolveProduct.execute(
      input.tenantId,
      input.companyId,
      input.productId,
      input.productVariantId,
    );
    const positiveQuantity = assertValidPositiveDecimal(input.quantity, "quantity");

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId,
      type: "ISSUE",
      quantity: negateDecimal(positiveQuantity),
      reason: input.reason ?? null,
      referenceType: input.referenceType ?? "MANUAL",
      referenceId: input.referenceId ?? null,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: new Date(),
    });

    const balance = await this.balances.applyMovement(movement);
    return { movement, balance };
  }
}
