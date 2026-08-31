import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { negateDecimal } from "../../domain/decimal";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { InventoryReservation } from "../../domain/inventory-reservation.entity";
import {
  INVENTORY_RESERVATION_REPOSITORY,
  InventoryReservationRepository,
} from "../../domain/inventory-reservation.repository";
import { INVENTORY_BALANCE_REPOSITORY, InventoryBalanceRepository } from "../../domain/inventory-balance.repository";
import { InventoryReservationNotActiveError, InventoryReservationNotFoundError } from "../errors";

export interface ReleaseReservationInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  reservationId: string;
}

/**
 * Frees a reservation's entire quantity back into `available` stock. The
 * reservation row is marked RELEASED first (a status transition can always
 * be safely retried/no-ops, unlike a ledger append), then the RELEASE
 * movement is posted — see the module's `docs/SECURITY.md` entry for the
 * accepted non-transactional trade-off this implies.
 */
@Injectable()
export class ReleaseReservationUseCase {
  constructor(
    @Inject(INVENTORY_RESERVATION_REPOSITORY) private readonly reservations: InventoryReservationRepository,
    @Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository,
  ) {}

  async execute(
    input: ReleaseReservationInput,
  ): Promise<{ reservation: InventoryReservation; movement: InventoryMovement }> {
    const reservation = await this.reservations.findById(input.tenantId, input.reservationId);
    if (!reservation || reservation.companyId !== input.companyId) {
      throw new InventoryReservationNotFoundError();
    }
    if (reservation.status !== "ACTIVE") {
      throw new InventoryReservationNotActiveError();
    }

    const now = new Date();
    reservation.release(now);
    await this.reservations.save(reservation);

    const movement = InventoryMovement.create({
      id: newId(),
      tenantId: reservation.tenantId,
      companyId: reservation.companyId,
      warehouseId: reservation.warehouseId,
      productId: reservation.productId,
      productVariantId: reservation.productVariantId,
      type: "RELEASE",
      quantity: negateDecimal(reservation.quantity),
      reason: null,
      referenceType: "RESERVATION",
      referenceId: reservation.id,
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
      createdAt: now,
    });
    await this.balances.applyMovement(movement);

    return { reservation, movement };
  }
}
