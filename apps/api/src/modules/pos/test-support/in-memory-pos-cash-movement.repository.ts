import { PosCashMovement } from "../domain/pos-cash-movement.entity";
import { PosCashMovementRepository } from "../domain/pos-cash-movement.repository";

export class InMemoryPosCashMovementRepository implements PosCashMovementRepository {
  private readonly byId = new Map<string, PosCashMovement>();

  async listByShift(tenantId: string, shiftId: string): Promise<PosCashMovement[]> {
    return [...this.byId.values()]
      .filter((m) => m.tenantId === tenantId && m.shiftId === shiftId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(movement: PosCashMovement): Promise<void> {
    this.byId.set(movement.id, movement);
  }
}
