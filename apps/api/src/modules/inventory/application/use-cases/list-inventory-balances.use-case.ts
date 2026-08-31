import { Inject, Injectable } from "@nestjs/common";
import { InventoryBalance } from "../../domain/inventory-balance.entity";
import {
  INVENTORY_BALANCE_REPOSITORY,
  InventoryBalanceRepository,
  ListInventoryBalancesFilter,
} from "../../domain/inventory-balance.repository";

export interface ListInventoryBalancesInput {
  tenantId: string;
  companyId: string;
  filter: ListInventoryBalancesFilter;
}

@Injectable()
export class ListInventoryBalancesUseCase {
  constructor(@Inject(INVENTORY_BALANCE_REPOSITORY) private readonly balances: InventoryBalanceRepository) {}

  async execute(input: ListInventoryBalancesInput): Promise<InventoryBalance[]> {
    return this.balances.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
