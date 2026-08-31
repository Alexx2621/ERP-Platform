import { InventoryReservation, InventoryReservationStatus } from "./inventory-reservation.entity";

export interface ListInventoryReservationsFilter {
  warehouseId?: string;
  productId?: string;
  status?: InventoryReservationStatus;
  limit: number;
}

export interface InventoryReservationRepository {
  findById(tenantId: string, id: string): Promise<InventoryReservation | null>;
  listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryReservationsFilter,
  ): Promise<InventoryReservation[]>;
  save(reservation: InventoryReservation): Promise<void>;
}

export const INVENTORY_RESERVATION_REPOSITORY = Symbol("INVENTORY_RESERVATION_REPOSITORY");
