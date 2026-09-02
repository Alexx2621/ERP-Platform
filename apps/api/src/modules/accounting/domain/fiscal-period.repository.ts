import { FiscalPeriod, FiscalPeriodStatus } from "./fiscal-period.entity";

export interface ListFiscalPeriodsFilter {
  status?: FiscalPeriodStatus;
  limit: number;
}

export interface FiscalPeriodRepository {
  findById(tenantId: string, id: string): Promise<FiscalPeriod | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<FiscalPeriod | null>;
  /** Every fiscal period for the company — used to check for date-range overlap on create and to resolve which period a given date falls into. Companies have few periods (dozens per decade at most), so a full scan is proportionate; no date-range index needed yet. */
  listByCompany(tenantId: string, companyId: string, filter: ListFiscalPeriodsFilter): Promise<FiscalPeriod[]>;
  save(period: FiscalPeriod): Promise<void>;
}

export const FISCAL_PERIOD_REPOSITORY = Symbol("FISCAL_PERIOD_REPOSITORY");
