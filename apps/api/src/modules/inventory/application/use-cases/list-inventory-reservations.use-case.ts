import { Inject, Injectable } from "@nestjs/common";
import { InventoryReservation } from "../../domain/inventory-reservation.entity";
import {
  INVENTORY_RESERVATION_REPOSITORY,
  InventoryReservationRepository,
  ListInventoryReservationsFilter,
} from "../../domain/inventory-reservation.repository";

export interface ListInventoryReservationsInput {
  tenantId: string;
  companyId: string;
  filter: ListInventoryReservationsFilter;
}

@Injectable()
export class ListInventoryReservationsUseCase {
  constructor(
    @Inject(INVENTORY_RESERVATION_REPOSITORY) private readonly reservations: InventoryReservationRepository,
  ) {}

  async execute(input: ListInventoryReservationsInput): Promise<InventoryReservation[]> {
    return this.reservations.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
