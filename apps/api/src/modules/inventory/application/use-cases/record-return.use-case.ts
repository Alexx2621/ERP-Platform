import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { InventoryMovement, InventoryMovementReferenceType } from "../../domain/inventory-movement.entity";
import { InventoryBalance } from "../../domain/inventory-balance.entity";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export interface RecordReturnInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  warehouseId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
  reason?: string | null;
  /** Omitted → MANUAL. Sales passes SALES_RETURN + its return id (see `CreateSalesReturnUseCase`). */
  referenceType?: InventoryMovementReferenceType;
  referenceId?: string | null;
}

/**
 * Stock restored to a warehouse from a customer return (MASTER_SPEC §20's
 * `RETURN` ledger type — distinct from `RECEIPT`, which represents new
 * incoming stock from a supplier, not goods coming back). Always positive:
 * a return can never drive on-hand negative, so this is the one write use
 * case in this module that can never reject on the balance invariant.
 */
@Injectable()
export class RecordReturnUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(input: RecordReturnInput): Promise<{ movement: InventoryMovement; balance: InventoryBalance }> {
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
      type: "RETURN",
      quantity: input.quantity,
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
