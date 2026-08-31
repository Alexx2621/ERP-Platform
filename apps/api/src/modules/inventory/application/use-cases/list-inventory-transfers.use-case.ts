import { Inject, Injectable } from "@nestjs/common";
import { InventoryTransfer } from "../../domain/inventory-transfer.entity";
import {
  INVENTORY_TRANSFER_REPOSITORY,
  InventoryTransferRepository,
  ListInventoryTransfersFilter,
} from "../../domain/inventory-transfer.repository";

export interface ListInventoryTransfersInput {
  tenantId: string;
  companyId: string;
  filter: ListInventoryTransfersFilter;
}

@Injectable()
export class ListInventoryTransfersUseCase {
  constructor(@Inject(INVENTORY_TRANSFER_REPOSITORY) private readonly transfers: InventoryTransferRepository) {}

  async execute(input: ListInventoryTransfersInput): Promise<InventoryTransfer[]> {
    return this.transfers.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
