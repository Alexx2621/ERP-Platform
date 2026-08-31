import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryTransfer } from "../../domain/inventory-transfer.entity";
import { INVENTORY_TRANSFER_REPOSITORY, InventoryTransferRepository } from "../../domain/inventory-transfer.repository";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { InventoryTransferNotFoundError, InventoryTransferNotInTransitError } from "../errors";

export interface CompleteTransferInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  transferId: string;
}

/**
 * Marks an IN_TRANSIT transfer as arrived: posts a TRANSFER_IN at the
 * destination, then updates the transfer's own status. Applying the
 * movement first (a pure positive addition, which the balance invariant
 * can never reject) keeps the ledger — this module's real source of truth
 * — correct even in the rare case the status update itself then fails;
 * only a stale `IN_TRANSIT` status would need manual reconciliation, never
 * a silently lost stock arrival.
 */
@Injectable()
export class CompleteTransferUseCase {
  constructor(
    @Inject(INVENTORY_TRANSFER_REPOSITORY) private readonly transfers: InventoryTransferRepository,
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
  ) {}

  async execute(input: CompleteTransferInput): Promise<{ transfer: InventoryTransfer; movement: InventoryMovement }> {
    const transfer = await this.transfers.findById(input.tenantId, input.transferId);
    if (!transfer || transfer.companyId !== input.companyId) {
      throw new InventoryTransferNotFoundError();
    }
    if (transfer.status !== "IN_TRANSIT") {
      throw new InventoryTransferNotInTransitError();
    }

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: transfer.tenantId,
      companyId: transfer.companyId,
      warehouseId: transfer.destinationWarehouseId,
      productId: transfer.productId,
      productVariantId: transfer.productVariantId,
      type: "TRANSFER_IN",
      quantity: transfer.quantity,
      reason: null,
      referenceType: "TRANSFER",
      referenceId: transfer.id,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: new Date(),
    });
    await this.balances.applyMovement(movement);

    transfer.complete(movement.createdAt);
    await this.transfers.save(transfer);

    return { transfer, movement };
  }
}
