import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryBalance } from "../../domain/inventory-balance.entity";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export interface RecordReceiptInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  warehouseId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
  reason?: string | null;
}

/**
 * Stock arriving into a warehouse with no corresponding InventoryTransfer
 * (e.g. a purchase receipt — Purchasing, Phase 5, will call this once it
 * exists; for now it is also reachable directly, `referenceType: "MANUAL"`).
 */
@Injectable()
export class RecordReceiptUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(input: RecordReceiptInput): Promise<{ movement: InventoryMovement; balance: InventoryBalance }> {
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.warehouseId);
    const productVariantId = await this.resolveProduct.execute(
      input.tenantId,
      input.companyId,
      input.productId,
      input.productVariantId,
    );

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId,
      type: "RECEIPT",
      quantity: input.quantity,
      reason: input.reason ?? null,
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
