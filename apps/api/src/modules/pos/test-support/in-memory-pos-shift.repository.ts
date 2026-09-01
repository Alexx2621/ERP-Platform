import { PosShift } from "../domain/pos-shift.entity";
import { ListPosShiftsFilter, PosShiftRepository } from "../domain/pos-shift.repository";

export class InMemoryPosShiftRepository implements PosShiftRepository {
  private readonly byId = new Map<string, PosShift>();

  async findById(tenantId: string, id: string): Promise<PosShift | null> {
    const shift = this.byId.get(id);
    return shift && shift.tenantId === tenantId ? shift : null;
  }

  async findOpenByRegister(tenantId: string, registerId: string): Promise<PosShift | null> {
    return (
      [...this.byId.values()].find(
        (s) => s.tenantId === tenantId && s.registerId === registerId && s.status === "OPEN",
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosShiftsFilter): Promise<PosShift[]> {
    return [...this.byId.values()]
      .filter(
        (s) =>
          s.tenantId === tenantId &&
          s.companyId === companyId &&
          (filter.registerId === undefined || s.registerId === filter.registerId) &&
          (filter.status === undefined || s.status === filter.status),
      )
      .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())
      .slice(0, filter.limit);
  }

  async save(shift: PosShift): Promise<void> {
    this.byId.set(shift.id, shift);
  }
}
