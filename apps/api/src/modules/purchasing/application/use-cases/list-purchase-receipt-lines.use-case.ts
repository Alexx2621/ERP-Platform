import { Inject, Injectable } from "@nestjs/common";
import { PurchaseReceiptLine } from "../../domain/purchase-receipt-line.entity";
import {
  PURCHASE_RECEIPT_LINE_REPOSITORY,
  PurchaseReceiptLineRepository,
} from "../../domain/purchase-receipt-line.repository";
import { PURCHASE_RECEIPT_REPOSITORY, PurchaseReceiptRepository } from "../../domain/purchase-receipt.repository";
import { PurchaseReceiptNotFoundError } from "../errors";

export interface ListPurchaseReceiptLinesInput {
  tenantId: string;
  companyId: string;
  purchaseReceiptId: string;
}

@Injectable()
export class ListPurchaseReceiptLinesUseCase {
  constructor(
    @Inject(PURCHASE_RECEIPT_REPOSITORY) private readonly receipts: PurchaseReceiptRepository,
    @Inject(PURCHASE_RECEIPT_LINE_REPOSITORY) private readonly lines: PurchaseReceiptLineRepository,
  ) {}

  async execute(input: ListPurchaseReceiptLinesInput): Promise<PurchaseReceiptLine[]> {
    const receipt = await this.receipts.findById(input.tenantId, input.purchaseReceiptId);
    if (!receipt || receipt.companyId !== input.companyId) {
      throw new PurchaseReceiptNotFoundError();
    }
    return this.lines.listByPurchaseReceipt(input.tenantId, receipt.id);
  }
}
