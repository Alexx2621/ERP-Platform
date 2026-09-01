import { Inject, Injectable } from "@nestjs/common";
import { SalesReturnLine } from "../../domain/sales-return-line.entity";
import { SALES_RETURN_LINE_REPOSITORY, SalesReturnLineRepository } from "../../domain/sales-return-line.repository";
import { SALES_RETURN_REPOSITORY, SalesReturnRepository } from "../../domain/sales-return.repository";
import { SalesReturnNotFoundError } from "../errors";

export interface ListSalesReturnLinesInput {
  tenantId: string;
  companyId: string;
  salesReturnId: string;
}

@Injectable()
export class ListSalesReturnLinesUseCase {
  constructor(
    @Inject(SALES_RETURN_REPOSITORY) private readonly salesReturns: SalesReturnRepository,
    @Inject(SALES_RETURN_LINE_REPOSITORY) private readonly lines: SalesReturnLineRepository,
  ) {}

  async execute(input: ListSalesReturnLinesInput): Promise<SalesReturnLine[]> {
    const salesReturn = await this.salesReturns.findById(input.tenantId, input.salesReturnId);
    if (!salesReturn || salesReturn.companyId !== input.companyId) {
      throw new SalesReturnNotFoundError();
    }
    return this.lines.listBySalesReturn(input.tenantId, salesReturn.id);
  }
}
