import { PosRegister } from "../domain/pos-register.entity";
import { ListPosRegistersFilter, PosRegisterRepository } from "../domain/pos-register.repository";

export class InMemoryPosRegisterRepository implements PosRegisterRepository {
  private readonly byId = new Map<string, PosRegister>();

  async findById(tenantId: string, id: string): Promise<PosRegister | null> {
    const register = this.byId.get(id);
    return register && register.tenantId === tenantId ? register : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<PosRegister | null> {
    return (
      [...this.byId.values()].find(
        (r) => r.tenantId === tenantId && r.companyId === companyId && r.code.toLowerCase() === code.toLowerCase(),
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosRegistersFilter): Promise<PosRegister[]> {
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.companyId === companyId &&
          (filter.status === undefined || r.status === filter.status),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(register: PosRegister): Promise<void> {
    this.byId.set(register.id, register);
  }
}
