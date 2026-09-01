import { PosSale } from "../domain/pos-sale.entity";
import { ListPosSalesFilter, PosSaleRepository } from "../domain/pos-sale.repository";
import { PosSaleIdempotencyConflictError } from "../application/errors";

export class InMemoryPosSaleRepository implements PosSaleRepository {
  private readonly byId = new Map<string, PosSale>();

  async findById(tenantId: string, id: string): Promise<PosSale | null> {
    const sale = this.byId.get(id);
    return sale && sale.tenantId === tenantId ? sale : null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosSale | null> {
    return (
      [...this.byId.values()].find(
        (s) => s.tenantId === tenantId && s.companyId === companyId && s.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listByShift(tenantId: string, shiftId: string): Promise<PosSale[]> {
    return [...this.byId.values()]
      .filter((s) => s.tenantId === tenantId && s.shiftId === shiftId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosSalesFilter): Promise<PosSale[]> {
    return [...this.byId.values()]
      .filter(
        (s) =>
          s.tenantId === tenantId && s.companyId === companyId && (filter.shiftId === undefined || s.shiftId === filter.shiftId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(sale: PosSale): Promise<void> {
    if (!this.byId.has(sale.id)) {
      const duplicate = await this.findByIdempotencyKey(sale.tenantId, sale.companyId, sale.idempotencyKey);
      if (duplicate) {
        throw new PosSaleIdempotencyConflictError();
      }
    }
    this.byId.set(sale.id, sale);
  }
}
