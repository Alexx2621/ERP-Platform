import { PosCashMovement } from "./pos-cash-movement.entity";

export interface PosCashMovementRepository {
  listByShift(tenantId: string, shiftId: string): Promise<PosCashMovement[]>;
  save(movement: PosCashMovement): Promise<void>;
}

export const POS_CASH_MOVEMENT_REPOSITORY = Symbol("POS_CASH_MOVEMENT_REPOSITORY");
