import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryReservation } from "../../domain/inventory-reservation.entity";
import {
  INVENTORY_RESERVATION_REPOSITORY,
  InventoryReservationRepository,
} from "../../domain/inventory-reservation.repository";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "./resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./resolve-product-target.use-case";

export interface CreateReservationInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  warehouseId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

/**
 * Earmarks stock without moving it physically. The RESERVATION movement is
 * applied FIRST — `InventoryBalanceRepository.applyMovement`'s shared
 * invariant (`onHand >= reserved`) is what actually rejects reserving more
 * than is available — and the `InventoryReservation` row is saved only
 * after that succeeds, so a rejected reservation never leaves a row behind.
 *
 * This ordering does leave one accepted, documented gap: if the ledger
 * write succeeds but the reservation-row save then fails (a transient
 * error), the balance would show stock reserved with no
 * `InventoryReservation` row to release it later. The same class of
 * two-step, non-transactional trade-off is already accepted elsewhere in
 * this codebase (e.g. ADR-008's Owner-role seeding not sharing a
 * transaction with tenant provisioning) rather than growing every
 * repository interface to accept an externally supplied transaction client
 * just to close a rare failure window (MASTER_SPEC §59/§93).
 */
@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
    @Inject(INVENTORY_RESERVATION_REPOSITORY) private readonly reservations: InventoryReservationRepository,
    private readonly resolveWarehouse: ResolveWarehouseTargetUseCase,
    private readonly resolveProduct: ResolveProductTargetUseCase,
  ) {}

  async execute(
    input: CreateReservationInput,
  ): Promise<{ reservation: InventoryReservation; movement: InventoryMovement }> {
    await this.resolveWarehouse.execute(input.tenantId, input.companyId, input.warehouseId);
    const productVariantId = await this.resolveProduct.execute(
      input.tenantId,
      input.companyId,
      input.productId,
      input.productVariantId,
    );

    const now = new Date();
    const reservationId = newId();

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId,
      type: "RESERVATION",
      quantity: input.quantity,
      reason: null,
      referenceType: "RESERVATION",
      referenceId: reservationId,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: now,
    });
    await this.balances.applyMovement(movement);

    const reservation = InventoryReservation.create({
      id: reservationId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      productVariantId,
      quantity: movement.quantity,
      status: "ACTIVE",
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      version: 1,
      createdAt: now,
      releasedAt: null,
    });
    await this.reservations.save(reservation);

    return { reservation, movement };
  }
}
