import { Inject, Injectable } from "@nestjs/common";
import { FiscalPeriod } from "../../domain/fiscal-period.entity";
import { FISCAL_PERIOD_REPOSITORY, FiscalPeriodRepository } from "../../domain/fiscal-period.repository";
import { NoOpenFiscalPeriodForDateError } from "../errors";

/** Resolves which OPEN fiscal period a given entry date belongs to — `CreateJournalEntryUseCase`/`ReverseJournalEntryUseCase`'s own guard against posting into a CLOSED or nonexistent period. */
@Injectable()
export class GetOpenFiscalPeriodForDateUseCase {
  constructor(@Inject(FISCAL_PERIOD_REPOSITORY) private readonly periods: FiscalPeriodRepository) {}

  async execute(tenantId: string, companyId: string, date: Date): Promise<FiscalPeriod> {
    const candidates = await this.periods.listByCompany(tenantId, companyId, { status: "OPEN", limit: 1000 });
    const match = candidates.find((period) => period.covers(date));
    if (!match) {
      throw new NoOpenFiscalPeriodForDateError();
    }
    return match;
  }
}
