import { CartLine } from "./cart-line.entity";

export interface CartLineRepository {
  findById(tenantId: string, id: string): Promise<CartLine | null>;
  findByCartAndTarget(tenantId: string, cartId: string, productId: string, productVariantId: string | null): Promise<CartLine | null>;
  listByCart(tenantId: string, cartId: string): Promise<CartLine[]>;
  save(line: CartLine): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const CART_LINE_REPOSITORY = Symbol("CART_LINE_REPOSITORY");
