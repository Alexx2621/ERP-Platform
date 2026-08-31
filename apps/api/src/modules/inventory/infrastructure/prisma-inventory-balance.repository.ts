import { Injectable } from "@nestjs/common";
import { Prisma, newId } from "@erp/database";
import type { InventoryBalance as PrismaInventoryBalance } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { InventoryBalance } from "../domain/inventory-balance.entity";
import { InventoryBalanceRepository, ListInventoryBalancesFilter } from "../domain/inventory-balance.repository";
import { InventoryMovement } from "../domain/inventory-movement.entity";
import { InsufficientInventoryError } from "../application/errors";

interface LockedBalanceRow {
  id: string;
  on_hand_quantity: unknown;
  reserved_quantity: unknown;
  version: number;
  created_at: Date;
}

const MAX_INSERT_RACE_ATTEMPTS = 3;

@Injectable()
export class PrismaInventoryBalanceRepository implements InventoryBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryBalancesFilter,
  ): Promise<InventoryBalance[]> {
    const records = await this.prisma.inventoryBalance.findMany({
      where: {
        tenantId,
        companyId,
        warehouseId: filter.warehouseId,
        productId: filter.productId,
        productVariantId: filter.productVariantId,
      },
      orderBy: [{ warehouseId: "asc" }, { productId: "asc" }],
    });
    return records.map((record) => this.toDomain(record));
  }

  /**
   * See `InventoryBalanceRepository.applyMovement`'s own docstring for the
   * invariant this enforces. Implementation notes:
   *
   * - `product_variant_id` participates in two hand-written PARTIAL unique
   *   indexes (see the `inventory_ledger` migration:
   *   `inventory_balances_variant_unique` WHERE NOT NULL,
   *   `inventory_balances_product_unique` WHERE NULL), not one plain
   *   `@@unique`, because Postgres treats every NULL in a unique index as
   *   distinct from every other NULL — a plain unique on (tenant,
   *   warehouse, product, variant) would let the same non-variant product
   *   accumulate unlimited balance rows in one warehouse. Prisma's schema
   *   DSL cannot express a partial index, so neither can `findUnique`/
   *   `upsert` target one — the row lock below and the first-insert path
   *   use raw SQL / a manually built `where` instead.
   * - `SELECT ... FOR UPDATE` locks an *existing* row for the transaction's
   *   duration, so a second concurrent caller targeting the same key
   *   blocks until the first commits — this is what makes the
   *   non-negative/oversell check safe under real concurrency, not merely
   *   correct for a single caller (docs/ROADMAP.md §7 exit criteria:
   *   "Pruebas concurrentes no permiten oversell/reservas negativas").
   * - A brand-new key has no row to lock, so two concurrent first-time
   *   callers can both proceed to INSERT; the partial unique index lets
   *   exactly one succeed (Postgres blocks the second INSERT until the
   *   first commits, then re-checks the constraint and raises a real
   *   conflict), and the loser's whole transaction — including the
   *   ledger row it already inserted — rolls back atomically and retries
   *   from scratch as an UPDATE path. Same P2002-retry shape already used
   *   by `PrismaInboxMessageRepository.tryClaim` (ADR-008), bounded here
   *   to avoid a runaway loop under pathological contention.
   *
   * The single invariant check below —
   * `nextOnHand >= 0 && nextReserved >= 0 && nextOnHand >= nextReserved` —
   * is what uniformly prevents oversell (ISSUE/TRANSFER_OUT past available
   * stock), negative reservations, and reserving beyond on-hand, without
   * needing a movement-type-specific branch: on-hand-decreasing types can
   * never drop below what is already reserved, and RESERVATION can never
   * push reserved above on-hand.
   */
  async applyMovement(movement: InventoryMovement): Promise<InventoryBalance> {
    for (let attempt = 1; attempt <= MAX_INSERT_RACE_ATTEMPTS; attempt++) {
      try {
        return await this.attemptApplyMovement(movement);
      } catch (error) {
        const isInsertRace = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (isInsertRace && attempt < MAX_INSERT_RACE_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("unreachable: applyMovement retry loop exited without returning or throwing");
  }

  private async attemptApplyMovement(movement: InventoryMovement): Promise<InventoryBalance> {
    const props = movement.toProps();
    const now = props.createdAt;

    return this.prisma.$transaction(async (tx) => {
      const variantClause = props.productVariantId
        ? Prisma.sql`"product_variant_id" = ${props.productVariantId}::uuid`
        : Prisma.sql`"product_variant_id" IS NULL`;

      const existing = await tx.$queryRaw<LockedBalanceRow[]>(Prisma.sql`
        SELECT "id", "on_hand_quantity", "reserved_quantity", "version", "created_at"
        FROM "inventory_balances"
        WHERE "tenant_id" = ${props.tenantId}::uuid
          AND "warehouse_id" = ${props.warehouseId}::uuid
          AND "product_id" = ${props.productId}::uuid
          AND ${variantClause}
        FOR UPDATE
      `);

      const delta = new Prisma.Decimal(props.quantity);
      const row = existing[0];
      const currentOnHand = row ? new Prisma.Decimal(row.on_hand_quantity as string) : new Prisma.Decimal(0);
      const currentReserved = row ? new Prisma.Decimal(row.reserved_quantity as string) : new Prisma.Decimal(0);

      const nextOnHand = movement.affectsOnHand ? currentOnHand.plus(delta) : currentOnHand;
      const nextReserved = movement.affectsOnHand ? currentReserved : currentReserved.plus(delta);

      if (nextOnHand.isNegative() || nextReserved.isNegative() || nextOnHand.minus(nextReserved).isNegative()) {
        throw new InsufficientInventoryError();
      }

      await tx.inventoryMovement.create({
        data: {
          id: props.id,
          tenantId: props.tenantId,
          companyId: props.companyId,
          warehouseId: props.warehouseId,
          productId: props.productId,
          productVariantId: props.productVariantId,
          type: props.type,
          quantity: props.quantity,
          reason: props.reason,
          referenceType: props.referenceType,
          referenceId: props.referenceId,
          correlationId: props.correlationId,
          createdByUserId: props.createdByUserId,
          createdAt: props.createdAt,
        },
      });

      if (!row) {
        const id = newId();
        await tx.inventoryBalance.create({
          data: {
            id,
            tenantId: props.tenantId,
            companyId: props.companyId,
            warehouseId: props.warehouseId,
            productId: props.productId,
            productVariantId: props.productVariantId,
            onHandQuantity: nextOnHand.toFixed(4),
            reservedQuantity: nextReserved.toFixed(4),
            version: 1,
            createdAt: now,
            updatedAt: now,
          },
        });
        return this.buildDomain(id, props, nextOnHand, nextReserved, 1, now, now);
      }

      await tx.inventoryBalance.update({
        where: { id: row.id },
        data: {
          onHandQuantity: nextOnHand.toFixed(4),
          reservedQuantity: nextReserved.toFixed(4),
          version: { increment: 1 },
          updatedAt: now,
        },
      });
      return this.buildDomain(row.id, props, nextOnHand, nextReserved, row.version + 1, row.created_at, now);
    });
  }

  private buildDomain(
    id: string,
    props: ReturnType<InventoryMovement["toProps"]>,
    onHand: InstanceType<typeof Prisma.Decimal>,
    reserved: InstanceType<typeof Prisma.Decimal>,
    version: number,
    createdAt: Date,
    updatedAt: Date,
  ): InventoryBalance {
    return InventoryBalance.create({
      id,
      tenantId: props.tenantId,
      companyId: props.companyId,
      warehouseId: props.warehouseId,
      productId: props.productId,
      productVariantId: props.productVariantId,
      onHandQuantity: onHand.toFixed(4),
      reservedQuantity: reserved.toFixed(4),
      version,
      createdAt,
      updatedAt,
    });
  }

  private toDomain(record: PrismaInventoryBalance): InventoryBalance {
    return InventoryBalance.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      warehouseId: record.warehouseId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      onHandQuantity: record.onHandQuantity.toFixed(4),
      reservedQuantity: record.reservedQuantity.toFixed(4),
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
