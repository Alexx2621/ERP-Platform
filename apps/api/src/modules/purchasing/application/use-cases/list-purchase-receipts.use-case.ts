import { Inject, Injectable } from "@nestjs/common";
import { PurchaseReceipt } from "../../domain/purchase-receipt.entity";
import {
  ListPurchaseReceiptsFilter,
  PURCHASE_RECEIPT_REPOSITORY,
  PurchaseReceiptRepository,
} from "../../domain/purchase-receipt.repository";

export interface ListPurchaseReceiptsInput {
  tenantId: string;
  companyId: string;
  filter: ListPurchaseReceiptsFilter;
}

@Injectable()
export class ListPurchaseReceiptsUseCase {
  constructor(@Inject(PURCHASE_RECEIPT_REPOSITORY) private readonly receipts: PurchaseReceiptRepository) {}

  async execute(input: ListPurchaseReceiptsInput): Promise<PurchaseReceipt[]> {
    return this.receipts.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
