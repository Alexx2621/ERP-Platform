import { Inject, Injectable } from "@nestjs/common";
import { SalesReturn } from "../../domain/sales-return.entity";
import { ListSalesReturnsFilter, SALES_RETURN_REPOSITORY, SalesReturnRepository } from "../../domain/sales-return.repository";

export interface ListSalesReturnsInput {
  tenantId: string;
  companyId: string;
  filter: ListSalesReturnsFilter;
}

@Injectable()
export class ListSalesReturnsUseCase {
  constructor(@Inject(SALES_RETURN_REPOSITORY) private readonly salesReturns: SalesReturnRepository) {}

  async execute(input: ListSalesReturnsInput): Promise<SalesReturn[]> {
    return this.salesReturns.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
