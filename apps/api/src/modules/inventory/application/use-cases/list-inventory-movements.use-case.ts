import { Inject, Injectable } from "@nestjs/common";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import {
  INVENTORY_MOVEMENT_REPOSITORY,
  InventoryMovementRepository,
  ListInventoryMovementsFilter,
} from "../../domain/inventory-movement.repository";

export interface ListInventoryMovementsInput {
  tenantId: string;
  companyId: string;
  filter: ListInventoryMovementsFilter;
}

@Injectable()
export class ListInventoryMovementsUseCase {
  constructor(@Inject(INVENTORY_MOVEMENT_REPOSITORY) private readonly movements: InventoryMovementRepository) {}

  async execute(input: ListInventoryMovementsInput): Promise<InventoryMovement[]> {
    return this.movements.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
