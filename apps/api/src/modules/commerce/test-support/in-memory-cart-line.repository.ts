import { CartLine } from "../domain/cart-line.entity";
import { CartLineRepository } from "../domain/cart-line.repository";

export class InMemoryCartLineRepository implements CartLineRepository {
  private readonly byId = new Map<string, CartLine>();

  async findById(tenantId: string, id: string): Promise<CartLine | null> {
    const record = this.byId.get(id);
    return record && record.tenantId === tenantId ? record : null;
  }

  async findByCartAndTarget(tenantId: string, cartId: string, productId: string, productVariantId: string | null): Promise<CartLine | null> {
    return (
      [...this.byId.values()].find(
        (l) => l.tenantId === tenantId && l.cartId === cartId && l.productId === productId && l.productVariantId === productVariantId,
      ) ?? null
    );
  }

  async listByCart(tenantId: string, cartId: string): Promise<CartLine[]> {
    return [...this.byId.values()]
      .filter((l) => l.tenantId === tenantId && l.cartId === cartId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(line: CartLine): Promise<void> {
    this.byId.set(line.id, line);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const record = this.byId.get(id);
    if (record && record.tenantId === tenantId) {
      this.byId.delete(id);
    }
  }
}
