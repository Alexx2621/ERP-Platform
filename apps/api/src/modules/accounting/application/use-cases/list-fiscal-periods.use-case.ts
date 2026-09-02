import { Inject, Injectable } from "@nestjs/common";
import { FiscalPeriod } from "../../domain/fiscal-period.entity";
import { FISCAL_PERIOD_REPOSITORY, FiscalPeriodRepository, ListFiscalPeriodsFilter } from "../../domain/fiscal-period.repository";

export interface ListFiscalPeriodsInput {
  tenantId: string;
  companyId: string;
  filter: ListFiscalPeriodsFilter;
}

@Injectable()
export class ListFiscalPeriodsUseCase {
  constructor(@Inject(FISCAL_PERIOD_REPOSITORY) private readonly periods: FiscalPeriodRepository) {}

  async execute(input: ListFiscalPeriodsInput): Promise<FiscalPeriod[]> {
    return this.periods.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
