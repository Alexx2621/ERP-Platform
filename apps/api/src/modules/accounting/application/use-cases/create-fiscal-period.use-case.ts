import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { FiscalPeriod } from "../../domain/fiscal-period.entity";
import { FISCAL_PERIOD_REPOSITORY, FiscalPeriodRepository } from "../../domain/fiscal-period.repository";
import { FiscalPeriodCodeAlreadyInUseError, FiscalPeriodOverlapsExistingError } from "../errors";

export interface CreateFiscalPeriodInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** Rejects a date range that overlaps any existing fiscal period for the company — a real posting must resolve to exactly one OPEN period for its date, never zero or several ambiguous ones. */
@Injectable()
export class CreateFiscalPeriodUseCase {
  constructor(@Inject(FISCAL_PERIOD_REPOSITORY) private readonly periods: FiscalPeriodRepository) {}

  async execute(input: CreateFiscalPeriodInput): Promise<FiscalPeriod> {
    const code = input.code.trim();
    const existingByCode = await this.periods.findByCode(input.tenantId, input.companyId, code);
    if (existingByCode) {
      throw new FiscalPeriodCodeAlreadyInUseError(code);
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const existingPeriods = await this.periods.listByCompany(input.tenantId, input.companyId, { limit: 1000 });
    const overlaps = existingPeriods.some(
      (period) => startDate.getTime() <= period.endDate.getTime() && endDate.getTime() >= period.startDate.getTime(),
    );
    if (overlaps) {
      throw new FiscalPeriodOverlapsExistingError();
    }

    const now = new Date();
    const period = FiscalPeriod.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      startDate,
      endDate,
      status: "OPEN",
      closedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.periods.save(period);
    return period;
  }
}
