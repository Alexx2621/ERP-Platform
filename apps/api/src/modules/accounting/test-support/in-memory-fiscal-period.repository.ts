import { FiscalPeriod } from "../domain/fiscal-period.entity";
import { FiscalPeriodRepository, ListFiscalPeriodsFilter } from "../domain/fiscal-period.repository";

export class InMemoryFiscalPeriodRepository implements FiscalPeriodRepository {
  private readonly byId = new Map<string, FiscalPeriod>();

  async findById(tenantId: string, id: string): Promise<FiscalPeriod | null> {
    const period = this.byId.get(id);
    return period && period.tenantId === tenantId ? period : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<FiscalPeriod | null> {
    return (
      [...this.byId.values()].find((p) => p.tenantId === tenantId && p.companyId === companyId && p.code === code) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListFiscalPeriodsFilter): Promise<FiscalPeriod[]> {
    return [...this.byId.values()]
      .filter((p) => p.tenantId === tenantId && p.companyId === companyId && (filter.status === undefined || p.status === filter.status))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, filter.limit);
  }

  async save(period: FiscalPeriod): Promise<void> {
    this.byId.set(period.id, period);
  }
}
