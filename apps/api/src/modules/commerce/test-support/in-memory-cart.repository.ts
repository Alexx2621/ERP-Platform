import { Cart } from "../domain/cart.entity";
import { CartRepository } from "../domain/cart.repository";

export class InMemoryCartRepository implements CartRepository {
  private readonly byId = new Map<string, Cart>();

  async findById(tenantId: string, id: string): Promise<Cart | null> {
    const record = this.byId.get(id);
    return record && record.tenantId === tenantId ? record : null;
  }

  async save(cart: Cart): Promise<void> {
    this.byId.set(cart.id, cart);
  }
}
