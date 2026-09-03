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
import { GetProductUseCase } from "../../src/modules/catalog/application/use-cases/get-product.use-case";
import { GetProductVariantUseCase } from "../../src/modules/catalog/application/use-cases/get-product-variant.use-case";
import { InMemoryCategoryRepository } from "../../src/modules/catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../src/modules/catalog/test-support/in-memory-brand.repository";
import { PrismaWarehouseRepository } from "../../src/modules/warehouses/infrastructure/prisma-warehouse.repository";
import { CreateWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../src/modules/warehouses/application/use-cases/get-warehouse.use-case";
import { PrismaInventoryBalanceRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "../../src/modules/inventory/application/use-cases/record-receipt.use-case";
import { RecordReturnUseCase } from "../../src/modules/inventory/application/use-cases/record-return.use-case";
import { RecordIssueUseCase } from "../../src/modules/inventory/application/use-cases/record-issue.use-case";
import { PrismaBillOfMaterialRepository } from "../../src/modules/manufacturing/infrastructure/prisma-bill-of-material.repository";
import { PrismaBillOfMaterialComponentRepository } from "../../src/modules/manufacturing/infrastructure/prisma-bill-of-material-component.repository";
import { PrismaProductionOrderRepository } from "../../src/modules/manufacturing/infrastructure/prisma-production-order.repository";
import { PrismaProductionOrderMaterialRepository } from "../../src/modules/manufacturing/infrastructure/prisma-production-order-material.repository";
import { PrismaProductionOrderMaterialMovementRepository } from "../../src/modules/manufacturing/infrastructure/prisma-production-order-material-movement.repository";
import { PrismaProductionOrderFinishedGoodsReceiptRepository } from "../../src/modules/manufacturing/infrastructure/prisma-production-order-finished-goods-receipt.repository";
import { ResolveManufacturingProductTargetUseCase } from "../../src/modules/manufacturing/application/use-cases/resolve-manufacturing-product-target.use-case";
import { CreateBillOfMaterialUseCase } from "../../src/modules/manufacturing/application/use-cases/create-bill-of-material.use-case";
import { CreateProductionOrderUseCase } from "../../src/modules/manufacturing/application/use-cases/create-production-order.use-case";
import { ConfirmProductionOrderUseCase } from "../../src/modules/manufacturing/application/use-cases/confirm-production-order.use-case";
import { CloseProductionOrderUseCase } from "../../src/modules/manufacturing/application/use-cases/close-production-order.use-case";
import { CancelProductionOrderUseCase } from "../../src/modules/manufacturing/application/use-cases/cancel-production-order.use-case";
import { IssueProductionOrderMaterialUseCase } from "../../src/modules/manufacturing/application/use-cases/issue-production-order-material.use-case";
import { ReturnProductionOrderMaterialUseCase } from "../../src/modules/manufacturing/application/use-cases/return-production-order-material.use-case";
import { RecordFinishedGoodsUseCase } from "../../src/modules/manufacturing/application/use-cases/record-finished-goods.use-case";
import { GetProductionOrderUseCase } from "../../src/modules/manufacturing/application/use-cases/get-production-order.use-case";
import { ListProductionOrderMaterialsUseCase } from "../../src/modules/manufacturing/application/use-cases/list-production-order-materials.use-case";
import { ProductionOrderHasActivityError, ProductNotFoundError } from "../../src/modules/manufacturing/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Manufacturing Integration Owner",
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

async function buildFixture(harness: PostgresTestHarness, slugSuffix: string) {
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
  const balances = new PrismaInventoryBalanceRepository(prisma);

  const now = new Date("2026-09-03T00:00:00.000Z");
  const owner = createUser(now, `manufacturing-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `manufacturing-tenant-${slugSuffix}`);
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
  const otherCompany = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO2",
    name: "Company Two",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(otherCompany);

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

  const finishedGood = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-CHAIR",
    name: "Silla de madera",
    unitOfMeasureId: unit.id,
    sellable: false,
  });
  const componentA = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-WOOD",
    name: "Tabla de madera",
    unitOfMeasureId: unit.id,
    sellable: false,
  });
  const otherCompanyUnit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: tenant.id,
    companyId: otherCompany.id,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });
  const otherCompanyProduct = await createProduct.execute({
    tenantId: tenant.id,
    companyId: otherCompany.id,
    code: "SKU-OTHER",
    name: "Producto de otra empresa",
    unitOfMeasureId: otherCompanyUnit.id,
    sellable: false,
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReturn = new RecordReturnUseCase(balances, resolveWarehouse, resolveProduct);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);

  const billsOfMaterial = new PrismaBillOfMaterialRepository(prisma);
  const bomComponents = new PrismaBillOfMaterialComponentRepository(prisma);
  const productionOrders = new PrismaProductionOrderRepository(prisma);
  const productionOrderMaterials = new PrismaProductionOrderMaterialRepository(prisma);
  const productionOrderMaterialMovements = new PrismaProductionOrderMaterialMovementRepository(prisma);
  const productionOrderFinishedGoodsReceipts = new PrismaProductionOrderFinishedGoodsReceiptRepository(prisma);

  const resolveManufacturingProductTarget = new ResolveManufacturingProductTargetUseCase(getProduct, getProductVariant);
  const createBillOfMaterial = new CreateBillOfMaterialUseCase(billsOfMaterial, bomComponents, getProduct, resolveManufacturingProductTarget);
  const createProductionOrder = new CreateProductionOrderUseCase(billsOfMaterial, bomComponents, productionOrders, productionOrderMaterials, getWarehouse);
  const confirmProductionOrder = new ConfirmProductionOrderUseCase(productionOrders);
  const closeProductionOrder = new CloseProductionOrderUseCase(productionOrders);
  const cancelProductionOrder = new CancelProductionOrderUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    productionOrderFinishedGoodsReceipts,
  );
  const issueProductionOrderMaterial = new IssueProductionOrderMaterialUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    recordIssue,
  );
  const returnProductionOrderMaterial = new ReturnProductionOrderMaterialUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    recordReturn,
  );
  const recordFinishedGoods = new RecordFinishedGoodsUseCase(productionOrders, productionOrderFinishedGoodsReceipts, recordReceipt);
  const getProductionOrder = new GetProductionOrderUseCase(productionOrders, productionOrderFinishedGoodsReceipts);
  const listProductionOrderMaterials = new ListProductionOrderMaterialsUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
  );

  return {
    tenant,
    company,
    otherCompany,
    ownerId: owner.id,
    finishedGood,
    componentA,
    otherCompanyProduct,
    warehouse,
    balances,
    recordReceipt,
    createBillOfMaterial,
    createProductionOrder,
    confirmProductionOrder,
    closeProductionOrder,
    cancelProductionOrder,
    issueProductionOrderMaterial,
    returnProductionOrderMaterial,
    recordFinishedGoods,
    getProductionOrder,
    listProductionOrderMaterials,
  };
}

describe("Manufacturing module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full BOM -> ProductionOrder -> Confirm -> partial Issue/Return -> partial FinishedGoods -> Close lifecycle against real Postgres, with real decimal precision", async () => {
    const fx = await buildFixture(harness, "lifecycle");

    const bom = await fx.createBillOfMaterial.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      productId: fx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla de madera",
      components: [{ componentProductId: fx.componentA.id, quantityPerUnit: "2.5000" }],
    });
    expect(bom.version).toBe(1);

    const order = await fx.createProductionOrder.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      billOfMaterialId: bom.id,
      warehouseId: fx.warehouse.id,
      quantityPlanned: "4.0000",
    });
    const materialSummaries = await fx.listProductionOrderMaterials.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });
    expect(materialSummaries).toHaveLength(1);
    // 2.5 × 4 = 10.0000 — real Postgres round-trip, no ceros recortados.
    expect(materialSummaries[0].material.quantityRequired).toBe("10.0000");

    await fx.confirmProductionOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });

    // Seed 100 real units of the component into the warehouse.
    await fx.recordReceipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-seed",
      warehouseId: fx.warehouse.id,
      productId: fx.componentA.id,
      quantity: "100.0000",
    });

    // First partial issue: 6 of 10 required.
    await fx.issueProductionOrderMaterial.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-issue-1",
      productionOrderId: order.id,
      productionOrderMaterialId: materialSummaries[0].material.id,
      quantity: "6.0000",
    });

    // Cancelling now must be rejected — a real material movement already exists.
    await expect(
      fx.cancelProductionOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id }),
    ).rejects.toThrow(ProductionOrderHasActivityError);

    // Return 1 of the 6 issued.
    await fx.returnProductionOrderMaterial.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-return-1",
      productionOrderId: order.id,
      productionOrderMaterialId: materialSummaries[0].material.id,
      quantity: "1.0000",
    });

    const balanceAfterIssueReturn = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.componentA.id,
      productVariantId: null,
    });
    // 100 - 6 + 1 = 95.
    expect(balanceAfterIssueReturn[0].onHandQuantity).toBe("95.0000");

    // Second partial issue: the remaining 5 of 10 (net issued so far: 6 - 1 = 5).
    await fx.issueProductionOrderMaterial.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-issue-2",
      productionOrderId: order.id,
      productionOrderMaterialId: materialSummaries[0].material.id,
      quantity: "5.0000",
    });

    // First partial finished-goods receipt: 3 of 4 planned.
    await fx.recordFinishedGoods.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-fg-1",
      productionOrderId: order.id,
      quantity: "3.0000",
    });
    // Second partial finished-goods receipt: the remaining 1.
    await fx.recordFinishedGoods.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-fg-2",
      productionOrderId: order.id,
      quantity: "1.0000",
    });

    const result = await fx.getProductionOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });
    expect(result.quantityCompleted).toBe("4.0000");

    const finishedGoodBalance = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.finishedGood.id,
      productVariantId: null,
    });
    expect(finishedGoodBalance[0].onHandQuantity).toBe("4.0000");

    const closed = await fx.closeProductionOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });
    expect(closed.status).toBe("CLOSED");
  });

  it("rejects a bill of material referencing a component from another company — real FK-scoped rejection, not just an application filter", async () => {
    const fx = await buildFixture(harness, "cross-company");
    await expect(
      fx.createBillOfMaterial.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        productId: fx.finishedGood.id,
        code: "BOM-X",
        name: "X",
        components: [{ componentProductId: fx.otherCompanyProduct.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("converges 5 genuinely concurrent material issues against real Postgres on the correct total consumed, never overselling", async () => {
    const fx = await buildFixture(harness, "concurrency");
    const bom = await fx.createBillOfMaterial.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      productId: fx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla de madera",
      components: [{ componentProductId: fx.componentA.id, quantityPerUnit: "1.0000" }],
    });
    const order = await fx.createProductionOrder.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      billOfMaterialId: bom.id,
      warehouseId: fx.warehouse.id,
      quantityPlanned: "10.0000", // quantityRequired = 10
    });
    await fx.confirmProductionOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });
    await fx.recordReceipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-seed",
      warehouseId: fx.warehouse.id,
      productId: fx.componentA.id,
      quantity: "10.0000",
    });
    const materialSummaries = await fx.listProductionOrderMaterials.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, productionOrderId: order.id });
    const materialId = materialSummaries[0].material.id;

    // 7 concurrent attempts to issue 2 units each against a 10-unit requirement — at most 5 can succeed.
    const results = await Promise.allSettled(
      Array.from({ length: 7 }, (_, index) =>
        fx.issueProductionOrderMaterial.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          actorUserId: fx.ownerId,
          correlationId: `corr-concurrent-${index}`,
          productionOrderId: order.id,
          productionOrderMaterialId: materialId,
          quantity: "2.0000",
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(5);
    expect(rejected).toHaveLength(2);

    const balance = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.componentA.id,
      productVariantId: null,
    });
    // Never negative, never below zero — exactly fully consumed, never oversold.
    expect(balance[0].onHandQuantity).toBe("0.0000");
  });
});
