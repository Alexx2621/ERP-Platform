import { Inject, Injectable } from "@nestjs/common";
import { PurchaseReturnLine } from "../../domain/purchase-return-line.entity";
import {
  PURCHASE_RETURN_LINE_REPOSITORY,
  PurchaseReturnLineRepository,
} from "../../domain/purchase-return-line.repository";
import { PURCHASE_RETURN_REPOSITORY, PurchaseReturnRepository } from "../../domain/purchase-return.repository";
import { PurchaseReturnNotFoundError } from "../errors";

export interface ListPurchaseReturnLinesInput {
  tenantId: string;
  companyId: string;
  purchaseReturnId: string;
}

@Injectable()
export class ListPurchaseReturnLinesUseCase {
  constructor(
    @Inject(PURCHASE_RETURN_REPOSITORY) private readonly purchaseReturns: PurchaseReturnRepository,
    @Inject(PURCHASE_RETURN_LINE_REPOSITORY) private readonly lines: PurchaseReturnLineRepository,
  ) {}

  async execute(input: ListPurchaseReturnLinesInput): Promise<PurchaseReturnLine[]> {
    const purchaseReturn = await this.purchaseReturns.findById(input.tenantId, input.purchaseReturnId);
    if (!purchaseReturn || purchaseReturn.companyId !== input.companyId) {
      throw new PurchaseReturnNotFoundError();
    }
    return this.lines.listByPurchaseReturn(input.tenantId, purchaseReturn.id);
  }
}
