import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryTransfer } from "../../domain/inventory-transfer.entity";
import { INVENTORY_TRANSFER_REPOSITORY, InventoryTransferRepository } from "../../domain/inventory-transfer.repository";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { InventoryTransferNotFoundError, InventoryTransferNotInTransitError } from "../errors";

export interface CancelTransferInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  transferId: string;
}

/**
 * Cancels an IN_TRANSIT transfer: posts a TRANSFER_CANCELLED movement at
 * the SOURCE warehouse, reversing the original TRANSFER_OUT (append-only
 * ledger — the original row is never edited or deleted, MASTER_SPEC §20),
 * then updates the transfer's own status. Same movement-first ordering
 * rationale as `CompleteTransferUseCase`.
 */
@Injectable()
export class CancelTransferUseCase {
  constructor(
    @Inject(INVENTORY_TRANSFER_REPOSITORY) private readonly transfers: InventoryTransferRepository,
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
  ) {}

  async execute(input: CancelTransferInput): Promise<{ transfer: InventoryTransfer; movement: InventoryMovement }> {
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
      warehouseId: transfer.sourceWarehouseId,
      productId: transfer.productId,
      productVariantId: transfer.productVariantId,
      type: "TRANSFER_CANCELLED",
      quantity: transfer.quantity,
      reason: null,
      referenceType: "TRANSFER",
      referenceId: transfer.id,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: new Date(),
    });
    await this.balances.applyMovement(movement);

    transfer.cancel(movement.createdAt);
    await this.transfers.save(transfer);

    return { transfer, movement };
  }
}
