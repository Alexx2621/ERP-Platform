import { Inject, Injectable } from "@nestjs/common";
import { PurchaseReturn } from "../../domain/purchase-return.entity";
import {
  ListPurchaseReturnsFilter,
  PURCHASE_RETURN_REPOSITORY,
  PurchaseReturnRepository,
} from "../../domain/purchase-return.repository";

export interface ListPurchaseReturnsInput {
  tenantId: string;
  companyId: string;
  filter: ListPurchaseReturnsFilter;
}

@Injectable()
export class ListPurchaseReturnsUseCase {
  constructor(@Inject(PURCHASE_RETURN_REPOSITORY) private readonly purchaseReturns: PurchaseReturnRepository) {}

  async execute(input: ListPurchaseReturnsInput): Promise<PurchaseReturn[]> {
    return this.purchaseReturns.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
