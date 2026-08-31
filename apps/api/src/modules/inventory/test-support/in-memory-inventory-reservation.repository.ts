import { InventoryReservation } from "../domain/inventory-reservation.entity";
import {
  InventoryReservationRepository,
  ListInventoryReservationsFilter,
} from "../domain/inventory-reservation.repository";

export class InMemoryInventoryReservationRepository implements InventoryReservationRepository {
  private readonly byId = new Map<string, InventoryReservation>();

  async findById(tenantId: string, id: string): Promise<InventoryReservation | null> {
    const reservation = this.byId.get(id);
    return reservation && reservation.tenantId === tenantId ? reservation : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryReservationsFilter,
  ): Promise<InventoryReservation[]> {
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.companyId === companyId &&
          (filter.status === undefined || r.status === filter.status) &&
          (filter.warehouseId === undefined || r.warehouseId === filter.warehouseId) &&
          (filter.productId === undefined || r.productId === filter.productId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(reservation: InventoryReservation): Promise<void> {
    this.byId.set(reservation.id, reservation);
  }
}
