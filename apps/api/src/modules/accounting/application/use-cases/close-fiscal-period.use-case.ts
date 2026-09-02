import { Inject, Injectable } from "@nestjs/common";
import { FiscalPeriod } from "../../domain/fiscal-period.entity";
import { FISCAL_PERIOD_REPOSITORY, FiscalPeriodRepository } from "../../domain/fiscal-period.repository";
import { FiscalPeriodNotFoundError } from "../errors";

export interface CloseFiscalPeriodInput {
  tenantId: string;
  companyId: string;
  id: string;
}

@Injectable()
export class CloseFiscalPeriodUseCase {
  constructor(@Inject(FISCAL_PERIOD_REPOSITORY) private readonly periods: FiscalPeriodRepository) {}

  async execute(input: CloseFiscalPeriodInput): Promise<FiscalPeriod> {
    const period = await this.periods.findById(input.tenantId, input.id);
    if (!period || period.companyId !== input.companyId) {
      throw new FiscalPeriodNotFoundError();
    }
    period.close(new Date());
    await this.periods.save(period);
    return period;
  }
}
