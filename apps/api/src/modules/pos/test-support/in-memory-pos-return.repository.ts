import { PosReturn } from "../domain/pos-return.entity";
import { ListPosReturnsFilter, PosReturnRepository } from "../domain/pos-return.repository";
import { PosReturnIdempotencyConflictError } from "../application/errors";

export class InMemoryPosReturnRepository implements PosReturnRepository {
  private readonly byId = new Map<string, PosReturn>();

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosReturn | null> {
    return (
      [...this.byId.values()].find(
        (r) => r.tenantId === tenantId && r.companyId === companyId && r.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listByPosSale(tenantId: string, posSaleId: string): Promise<PosReturn[]> {
    return [...this.byId.values()]
      .filter((r) => r.tenantId === tenantId && r.posSaleId === posSaleId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByShift(tenantId: string, shiftId: string): Promise<PosReturn[]> {
    return [...this.byId.values()]
      .filter((r) => r.tenantId === tenantId && r.shiftId === shiftId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosReturnsFilter): Promise<PosReturn[]> {
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId && r.companyId === companyId && (filter.shiftId === undefined || r.shiftId === filter.shiftId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(posReturn: PosReturn): Promise<void> {
    if (!this.byId.has(posReturn.id)) {
      const duplicate = await this.findByIdempotencyKey(posReturn.tenantId, posReturn.companyId, posReturn.idempotencyKey);
      if (duplicate) {
        throw new PosReturnIdempotencyConflictError();
      }
    }
    this.byId.set(posReturn.id, posReturn);
  }
}
