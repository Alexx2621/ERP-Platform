import { CommerceOrder } from "../domain/commerce-order.entity";
import { CommerceOrderRepository, ListCommerceOrdersFilter } from "../domain/commerce-order.repository";
import { CommerceOrderIdempotencyConflictError } from "../application/errors";

export class InMemoryCommerceOrderRepository implements CommerceOrderRepository {
  private readonly byId = new Map<string, CommerceOrder>();

  async findById(tenantId: string, id: string): Promise<CommerceOrder | null> {
    const record = this.byId.get(id);
    return record && record.tenantId === tenantId ? record : null;
  }

  async findByCartId(tenantId: string, companyId: string, cartId: string): Promise<CommerceOrder | null> {
    return (
      [...this.byId.values()].find((o) => o.tenantId === tenantId && o.companyId === companyId && o.cartId === cartId) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListCommerceOrdersFilter): Promise<CommerceOrder[]> {
    return [...this.byId.values()]
      .filter(
        (o) => o.tenantId === tenantId && o.companyId === companyId && (filter.storefrontId === undefined || o.storefrontId === filter.storefrontId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(order: CommerceOrder): Promise<void> {
    if (!this.byId.has(order.id)) {
      const duplicate = await this.findByCartId(order.tenantId, order.companyId, order.cartId);
      if (duplicate) {
        throw new CommerceOrderIdempotencyConflictError();
      }
    }
    this.byId.set(order.id, order);
  }
}
