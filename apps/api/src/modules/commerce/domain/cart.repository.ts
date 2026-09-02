import { Cart } from "./cart.entity";

export interface CartRepository {
  findById(tenantId: string, id: string): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
}

export const CART_REPOSITORY = Symbol("CART_REPOSITORY");
