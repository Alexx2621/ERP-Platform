import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { negateDecimal } from "../../domain/decimal";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryTransfer } from "../../domain/inventory-transfer.entity";
import { INVENTORY_TRANSFER_REPOSITORY, InventoryTransferRepository } from "../../domain/inventory-transfer.repository";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { SameWarehouseTransferError } from "../errors";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export interface CreateTransferInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  productId: string;
  productVariantId?: string | null;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: string;
}

/**
 * Moves stock between two warehouses of the same company. Posts a
 * TRANSFER_OUT at the source immediately — stock leaves on-hand right away,
 * not just an "intent" — so `IN_TRANSIT` transfers are queryable as stock
 * genuinely in motion (`InventoryTransfer.status = IN_TRANSIT`), not double
 * counted with the source's own on-hand.
 *
 * Same ordering rationale as `CreateReservationUseCase`: the movement is
 * applied first (so a rejected transfer — insufficient available stock at
 * the source — never creates an orphaned transfer row), and the transfer
 * row is saved only after that succeeds.
 */
@Injectable()
export class CreateTransferUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    @Inject(INVENTORY_TRANSFER_REPOSITORY) private readonly transfers: InventoryTransferRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(input: CreateTransferInput): Promise<{ transfer: InventoryTransfer; movement: InventoryMovement }> {
    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new SameWarehouseTransferError();
    }
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.sourceWarehouseId);
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.destinationWarehouseId);
    const productVariantId = await this.resolveProduct.execute(
      input.tenantId,
      input.companyId,
      input.productId,
      input.productVariantId,
    );

    const now = new Date();
    const transferId = newId();

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.sourceWarehouseId,
      productId: input.productId,
      productVariantId,
      type: "TRANSFER_OUT",
      quantity: negateDecimal(input.quantity),
      reason: null,
      referenceType: "TRANSFER",
      referenceId: transferId,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: now,
    });
    await this.balances.applyMovement(movement);

    const transfer = InventoryTransfer.create({
      id: transferId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      productId: input.productId,
      productVariantId,
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      quantity: negateDecimal(movement.quantity),
      status: "IN_TRANSIT",
      version: 1,
      createdAt: now,
      completedAt: null,
      cancelledAt: null,
    });
    await this.transfers.save(transfer);

    return { transfer, movement };
  }
}
