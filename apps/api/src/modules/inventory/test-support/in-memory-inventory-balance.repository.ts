import { addDecimal, isNegativeDecimal, subtractDecimal } from "../domain/decimal";
import { InventoryBalance } from "../domain/inventory-balance.entity";
import { InventoryBalanceRepository, ListInventoryBalancesFilter } from "../domain/inventory-balance.repository";
import { InventoryMovement } from "../domain/inventory-movement.entity";
import { InsufficientInventoryError } from "../application/errors";
import { InMemoryInventoryMovementRepository } from "./in-memory-inventory-movement.repository";

/**
 * Mirrors `PrismaInventoryBalanceRepository.applyMovement`'s invariant
 * exactly (same three checks, same BigInt-precise decimal math via
 * `domain/decimal.ts`), without needing a real row lock: a single Node
 * process running `await`-sequenced test code has no genuine concurrent
 * writers to a plain in-memory array, so there is nothing to lock. Real
 * concurrency is verified against actual Postgres in the integration
 * suite, not here.
 */
export class InMemoryInventoryBalanceRepository implements InventoryBalanceRepository {
  readonly items: InventoryBalance[] = [];
  private nextId = 1;

  constructor(private readonly movements?: InMemoryInventoryMovementRepository) {}

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryBalancesFilter,
  ): Promise<InventoryBalance[]> {
    return this.items.filter(
      (b) =>
        b.tenantId === tenantId &&
        b.companyId === companyId &&
        (filter.warehouseId === undefined || b.warehouseId === filter.warehouseId) &&
        (filter.productId === undefined || b.productId === filter.productId) &&
        (filter.productVariantId === undefined || b.productVariantId === filter.productVariantId),
    );
  }

  async applyMovement(movement: InventoryMovement): Promise<InventoryBalance> {
    const props = movement.toProps();
    const existing = this.items.find(
      (b) =>
        b.tenantId === props.tenantId &&
        b.warehouseId === props.warehouseId &&
        b.productId === props.productId &&
        b.productVariantId === props.productVariantId,
    );

    const currentOnHand = existing ? existing.onHandQuantity : "0.0000";
    const currentReserved = existing ? existing.reservedQuantity : "0.0000";
    const nextOnHand = movement.affectsOnHand ? addDecimal(currentOnHand, props.quantity) : currentOnHand;
    const nextReserved = movement.affectsOnHand ? currentReserved : addDecimal(currentReserved, props.quantity);

    if (
      isNegativeDecimal(nextOnHand) ||
      isNegativeDecimal(nextReserved) ||
      isNegativeDecimal(subtractDecimal(nextOnHand, nextReserved))
    ) {
      throw new InsufficientInventoryError();
    }

    this.movements?.push(movement);

    const now = props.createdAt;
    if (existing) {
      const updated = InventoryBalance.create({
        ...existing.toProps(),
        onHandQuantity: nextOnHand,
        reservedQuantity: nextReserved,
        version: existing.version + 1,
        updatedAt: now,
      });
      this.items[this.items.indexOf(existing)] = updated;
      return updated;
    }

    const created = InventoryBalance.create({
      id: `balance-${this.nextId++}`,
      tenantId: props.tenantId,
      companyId: props.companyId,
      warehouseId: props.warehouseId,
      productId: props.productId,
      productVariantId: props.productVariantId,
      onHandQuantity: nextOnHand,
      reservedQuantity: nextReserved,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    this.items.push(created);
    return created;
  }
}
