import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { PrismaUnitOfMeasureRepository } from "../../src/modules/catalog/infrastructure/prisma-unit-of-measure.repository";
import { PrismaProductRepository } from "../../src/modules/catalog/infrastructure/prisma-product.repository";
import { PrismaProductVariantRepository } from "../../src/modules/catalog/infrastructure/prisma-product-variant.repository";
import { CreateUnitOfMeasureUseCase } from "../../src/modules/catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../src/modules/catalog/application/use-cases/create-product.use-case";
import { AddProductVariantUseCase } from "../../src/modules/catalog/application/use-cases/add-product-variant.use-case";
import { GetProductUseCase } from "../../src/modules/catalog/application/use-cases/get-product.use-case";
import { GetProductVariantUseCase } from "../../src/modules/catalog/application/use-cases/get-product-variant.use-case";
import { InMemoryCategoryRepository } from "../../src/modules/catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../src/modules/catalog/test-support/in-memory-brand.repository";
import { PrismaWarehouseRepository } from "../../src/modules/warehouses/infrastructure/prisma-warehouse.repository";
import { CreateWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/get-warehouse.use-case";
import { PrismaInventoryMovementRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-movement.repository";
import { PrismaInventoryBalanceRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-balance.repository";
import { PrismaInventoryTransferRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-transfer.repository";
import { PrismaInventoryReservationRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-reservation.repository";
import { ResolveWarehouseTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "../../src/modules/inventory/application/use-cases/record-receipt.use-case";
import { RecordIssueUseCase } from "../../src/modules/inventory/application/use-cases/record-issue.use-case";
import { AdjustInventoryUseCase } from "../../src/modules/inventory/application/use-cases/adjust-inventory.use-case";
import { CreateReservationUseCase } from "../../src/modules/inventory/application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "../../src/modules/inventory/application/use-cases/release-reservation.use-case";
import { CreateTransferUseCase } from "../../src/modules/inventory/application/use-cases/create-transfer.use-case";
import { CompleteTransferUseCase } from "../../src/modules/inventory/application/use-cases/complete-transfer.use-case";
import { CancelTransferUseCase } from "../../src/modules/inventory/application/use-cases/cancel-transfer.use-case";
import { InsufficientInventoryError } from "../../src/modules/inventory/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Inventory Integration Owner",
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

interface Fixture {
  tenant: Tenant;
  company: Company;
  ownerId: string;
  warehouse1Id: string;
  warehouse2Id: string;
  productId: string;
  variantProductId: string;
  variantId: string;
  useCases: {
    receipt: RecordReceiptUseCase;
    issue: RecordIssueUseCase;
    adjust: AdjustInventoryUseCase;
    createReservation: CreateReservationUseCase;
    releaseReservation: ReleaseReservationUseCase;
    createTransfer: CreateTransferUseCase;
    completeTransfer: CompleteTransferUseCase;
    cancelTransfer: CancelTransferUseCase;
  };
  repositories: {
    movements: PrismaInventoryMovementRepository;
    balances: PrismaInventoryBalanceRepository;
  };
}

async function buildFixture(harness: PostgresTestHarness, slugSuffix: string): Promise<Fixture> {
  const prisma = asRepositoryClient(harness.prisma);
  const users = new PrismaUserRepository(prisma);
  const tenants = new PrismaTenantRepository(prisma);
  const organizations = new PrismaOrganizationRepository(prisma);
  const companies = new PrismaCompanyRepository(prisma);
  const units = new PrismaUnitOfMeasureRepository(prisma);
  const products = new PrismaProductRepository(prisma);
  const variants = new PrismaProductVariantRepository(prisma);
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const warehouses = new PrismaWarehouseRepository(prisma);
  const movements = new PrismaInventoryMovementRepository(prisma);
  const balances = new PrismaInventoryBalanceRepository(prisma);
  const transfers = new PrismaInventoryTransferRepository(prisma);
  const reservations = new PrismaInventoryReservationRepository(prisma);
  const now = new Date("2026-08-31T00:00:00.000Z");

  const owner = createUser(now, `inventory-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `inv-tenant-${slugSuffix}`);
  await users.save(owner);
  await tenants.save(tenant);

  const org = Organization.create({
    id: newId(),
    tenantId: tenant.id,
    code: "HQ",
    name: "HQ",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await organizations.save(org);
  const company = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO1",
    name: "Company One",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(company);

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const getProduct = new GetProductUseCase(products);
  const getProductVariant = new GetProductVariantUseCase(variants);
  const addVariant = new AddProductVariantUseCase(variants, products);

  const product = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-1",
    name: "Producto Rastreado",
    unitOfMeasureId: unit.id,
    basePrice: "10.0000",
  });
  const variantProduct = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-2",
    name: "Camisa",
    unitOfMeasureId: unit.id,
    hasVariants: true,
  });
  const variant = await addVariant.execute({
    tenantId: tenant.id,
    companyId: company.id,
    productId: variantProduct.id,
    sku: `SHIRT-BLUE-M-${slugSuffix}`,
    attributes: { color: "Azul", talla: "M" },
    price: "15.0000",
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse1 = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });
  const warehouse2 = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-2", name: "Bodega 2" });

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);

  return {
    tenant,
    company,
    ownerId: owner.id,
    warehouse1Id: warehouse1.id,
    warehouse2Id: warehouse2.id,
    productId: product.id,
    variantProductId: variantProduct.id,
    variantId: variant.id,
    useCases: {
      receipt: new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct),
      issue: new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct),
      adjust: new AdjustInventoryUseCase(balances, resolveWarehouse, resolveProduct),
      createReservation: new CreateReservationUseCase(balances, reservations, resolveWarehouse, resolveProduct),
      releaseReservation: new ReleaseReservationUseCase(reservations, balances),
      createTransfer: new CreateTransferUseCase(balances, transfers, resolveWarehouse, resolveProduct),
      completeTransfer: new CompleteTransferUseCase(transfers, balances),
      cancelTransfer: new CancelTransferUseCase(transfers, balances),
    },
    repositories: { movements, balances },
  };
}

describe("Inventory module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("enforces real decimal round-trip, variant-level tracking, the full transfer lifecycle, and cross-tenant isolation", async () => {
    const fx = await buildFixture(harness, "main");
    const { receipt, issue, adjust, createReservation, releaseReservation, createTransfer, completeTransfer, cancelTransfer } =
      fx.useCases;
    const actorUserId = fx.ownerId;

    // --- Receipt: real decimal round-trip against numeric(14,4) ---
    const { movement: receiptMovement, balance: afterReceipt } = await receipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-receipt",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      quantity: "100.5000",
    });
    expect(receiptMovement.quantity).toBe("100.5000");
    expect(afterReceipt.onHandQuantity).toBe("100.5000");

    // --- Variant-level tracking: a separate balance row per variant ---
    const { balance: variantBalance } = await receipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-receipt-variant",
      warehouseId: fx.warehouse1Id,
      productId: fx.variantProductId,
      productVariantId: fx.variantId,
      quantity: "8.0000",
    });
    expect(variantBalance.productVariantId).toBe(fx.variantId);
    expect(variantBalance.onHandQuantity).toBe("8.0000");
    const nonVariantBalances = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.variantProductId,
      productVariantId: null,
    });
    expect(nonVariantBalances).toHaveLength(0); // the variant row never collides with a phantom non-variant row for the same product

    // --- Issue: real oversell rejection against Postgres ---
    await expect(
      issue.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId,
        correlationId: "corr-issue-oversell",
        warehouseId: fx.warehouse1Id,
        productId: fx.productId,
        quantity: "1000.0000",
      }),
    ).rejects.toThrow(InsufficientInventoryError);

    const { balance: afterIssue } = await issue.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-issue",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      quantity: "0.5000",
    });
    expect(afterIssue.onHandQuantity).toBe("100.0000");

    // --- Adjustment ---
    const { balance: afterAdjustment } = await adjust.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-adjust",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      direction: "DECREASE",
      quantity: "10.0000",
      reason: "Conteo físico encontró faltante",
    });
    expect(afterAdjustment.onHandQuantity).toBe("90.0000");

    // --- Reservation + Release ---
    const { reservation } = await createReservation.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-reserve",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      quantity: "20.0000",
      referenceType: "manual-test",
      referenceId: "ref-1",
    });
    const reservedBalances = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(reservedBalances[0].reservedQuantity).toBe("20.0000");
    expect(reservedBalances[0].availableQuantity).toBe("70.0000");

    const { reservation: released } = await releaseReservation.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-release",
      reservationId: reservation.id,
    });
    expect(released.status).toBe("RELEASED");
    const afterRelease = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(afterRelease[0].reservedQuantity).toBe("0.0000");

    // --- Transfer: create -> complete, and a second create -> cancel ---
    const { transfer: completedTransfer } = await createTransfer.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-transfer-1",
      productId: fx.productId,
      sourceWarehouseId: fx.warehouse1Id,
      destinationWarehouseId: fx.warehouse2Id,
      quantity: "15.0000",
    });
    await completeTransfer.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-transfer-1-complete",
      transferId: completedTransfer.id,
    });
    const destinationBalance = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse2Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(destinationBalance[0].onHandQuantity).toBe("15.0000");

    const { transfer: cancelledTransfer } = await createTransfer.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-transfer-2",
      productId: fx.productId,
      sourceWarehouseId: fx.warehouse1Id,
      destinationWarehouseId: fx.warehouse2Id,
      quantity: "5.0000",
    });
    const sourceAfterOut = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(sourceAfterOut[0].onHandQuantity).toBe("70.0000"); // 90 - 15 (transferred) - 5 (in transit)

    await cancelTransfer.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-transfer-2-cancel",
      transferId: cancelledTransfer.id,
    });
    const sourceAfterCancel = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(sourceAfterCancel[0].onHandQuantity).toBe("75.0000"); // the 5 units returned

    // The original TRANSFER_OUT row was never edited/deleted — the ledger
    // gained a NEW TRANSFER_CANCELLED row instead (append-only).
    const allMovements = await fx.repositories.movements.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      limit: 100,
    });
    const transferOutRows = allMovements.filter((m) => m.type === "TRANSFER_OUT");
    const cancelledRows = allMovements.filter((m) => m.type === "TRANSFER_CANCELLED");
    expect(transferOutRows).toHaveLength(2); // both transfers' original TRANSFER_OUT rows survive untouched
    expect(cancelledRows).toHaveLength(1);

    // --- Cross-tenant isolation ---
    const otherTenantBalances = await fx.repositories.balances.listByCompany(newId(), fx.company.id, {});
    expect(otherTenantBalances).toHaveLength(0);
  });

  it("prevents oversell and negative reservations under real concurrent writers (docs/ROADMAP.md §7 exit criteria)", async () => {
    const fx = await buildFixture(harness, "concurrency");
    const { receipt, issue, createReservation } = fx.useCases;
    const actorUserId = fx.ownerId;

    await receipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-seed",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      quantity: "10.0000",
    });

    // 7 concurrent issues of 2.0000 each against 10.0000 on-hand: at most 5
    // can succeed (5 * 2 = 10); the rest must be rejected, never oversold.
    const issueAttempts = await Promise.allSettled(
      Array.from({ length: 7 }, (_, i) =>
        issue.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          actorUserId,
          correlationId: `corr-concurrent-issue-${i}`,
          warehouseId: fx.warehouse1Id,
          productId: fx.productId,
          quantity: "2.0000",
        }),
      ),
    );
    const succeededIssues = issueAttempts.filter((r) => r.status === "fulfilled");
    const failedIssues = issueAttempts.filter((r) => r.status === "rejected");
    expect(succeededIssues).toHaveLength(5);
    expect(failedIssues).toHaveLength(2);
    for (const failure of failedIssues) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientInventoryError);
    }

    const [balanceAfterIssues] = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(balanceAfterIssues.onHandQuantity).toBe("0.0000");
    expect(balanceAfterIssues.onHandQuantity.startsWith("-")).toBe(false);

    const issueMovements = await fx.repositories.movements.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      limit: 100,
    });
    expect(issueMovements.filter((m) => m.type === "ISSUE")).toHaveLength(5); // rejected attempts never touched the ledger

    // Replenish, then hammer RESERVATION concurrently the same way: 7
    // concurrent reservations of 2.0000 each against 10.0000 on-hand.
    await receipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId,
      correlationId: "corr-replenish",
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      quantity: "10.0000",
    });

    const reservationAttempts = await Promise.allSettled(
      Array.from({ length: 7 }, (_, i) =>
        createReservation.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          actorUserId,
          correlationId: `corr-concurrent-reserve-${i}`,
          warehouseId: fx.warehouse1Id,
          productId: fx.productId,
          quantity: "2.0000",
        }),
      ),
    );
    const succeededReservations = reservationAttempts.filter((r) => r.status === "fulfilled");
    const failedReservations = reservationAttempts.filter((r) => r.status === "rejected");
    expect(succeededReservations).toHaveLength(5);
    expect(failedReservations).toHaveLength(2);

    const [balanceAfterReservations] = await fx.repositories.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse1Id,
      productId: fx.productId,
      productVariantId: null,
    });
    expect(balanceAfterReservations.onHandQuantity).toBe("10.0000");
    expect(balanceAfterReservations.reservedQuantity).toBe("10.0000");
    expect(balanceAfterReservations.availableQuantity).toBe("0.0000");
    expect(balanceAfterReservations.reservedQuantity.startsWith("-")).toBe(false);
  }, 60_000);
});
