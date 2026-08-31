import { InventoryBalance } from "./inventory-balance.entity";
import { InventoryMovement } from "./inventory-movement.entity";

export interface ListInventoryBalancesFilter {
  warehouseId?: string;
  productId?: string;
  /** undefined = don't filter on this dimension; null = only the non-variant row; a string = only that variant. */
  productVariantId?: string | null;
}

/**
 * The sole writer of `inventory_balances` and, transitively (via
 * `applyMovement`), of `inventory_movements` too — see that method's own
 * docstring for why both writes are combined behind one repository instead
 * of living on two independent ones.
 */
export interface InventoryBalanceRepository {
  listByCompany(tenantId: string, companyId: string, filter: ListInventoryBalancesFilter): Promise<InventoryBalance[]>;

  /**
   * Atomically appends `movement` to the ledger and applies its signed
   * `quantity` to the (warehouse, product/variant) balance row identified
   * by the movement's own fields — creating that row on first use.
   *
   * Enforces, under a row lock, the single invariant that makes every
   * balance change in this module concurrency-safe:
   *   nextOnHand >= 0 AND nextReserved >= 0 AND nextOnHand >= nextReserved
   * (equivalently: `available = onHand - reserved` never goes negative).
   * This one check is what prevents oversell (ISSUE/TRANSFER_OUT past
   * available stock), negative reservations, and over-reservation beyond
   * on-hand — see the Prisma implementation's docstring for the full
   * reasoning and the locking strategy.
   *
   * Rejects with `InsufficientInventoryError` if applying the movement
   * would violate that invariant. Never partially applies a movement: the
   * ledger row and the balance row change together or not at all.
   */
  applyMovement(movement: InventoryMovement): Promise<InventoryBalance>;
}

export const INVENTORY_BALANCE_REPOSITORY = Symbol("INVENTORY_BALANCE_REPOSITORY");
