import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { Membership } from "../../src/core/tenants/domain/membership.entity";
import { PrismaMembershipRepository } from "../../src/core/tenants/infrastructure/prisma-membership.repository";
import { Permission } from "../../src/core/access-control/domain/permission.entity";
import { Role } from "../../src/core/access-control/domain/role.entity";
import { RoleAssignment } from "../../src/core/access-control/domain/role-assignment.entity";
import { PrismaPermissionRepository } from "../../src/core/access-control/infrastructure/prisma-permission.repository";
import { PrismaRoleRepository } from "../../src/core/access-control/infrastructure/prisma-role.repository";
import { PrismaRoleAssignmentRepository } from "../../src/core/access-control/infrastructure/prisma-role-assignment.repository";
import { HasPermissionUseCase } from "../../src/core/access-control/application/use-cases/has-permission.use-case";
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
import { PrismaSupplierRepository } from "../../src/modules/suppliers/infrastructure/prisma-supplier.repository";
import { CreateSupplierUseCase } from "../../src/modules/suppliers/application/use-cases/create-supplier.use-case";
import { GetSupplierUseCase } from "../../src/modules/suppliers/application/use-cases/get-supplier.use-case";
import { PrismaInventoryBalanceRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "../../src/modules/inventory/application/use-cases/record-receipt.use-case";
import { RecordIssueUseCase } from "../../src/modules/inventory/application/use-cases/record-issue.use-case";
import { PrismaPurchaseOrderRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-order.repository";
import { PrismaPurchaseOrderLineRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-order-line.repository";
import { PrismaPurchaseReceiptRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-receipt.repository";
import { PrismaPurchaseReceiptLineRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-receipt-line.repository";
import { PrismaPurchaseReturnRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-return.repository";
import { PrismaPurchaseReturnLineRepository } from "../../src/modules/purchasing/infrastructure/prisma-purchase-return-line.repository";
import { ResolveSupplierTargetUseCase } from "../../src/modules/purchasing/application/use-cases/resolve-supplier-target.use-case";
import { ResolvePurchaseLineTargetUseCase } from "../../src/modules/purchasing/application/use-cases/resolve-purchase-line-target.use-case";
import { CreatePurchaseOrderUseCase } from "../../src/modules/purchasing/application/use-cases/create-purchase-order.use-case";
import { AddPurchaseOrderLineUseCase } from "../../src/modules/purchasing/application/use-cases/add-purchase-order-line.use-case";
import { ConfirmPurchaseOrderUseCase } from "../../src/modules/purchasing/application/use-cases/confirm-purchase-order.use-case";
import { ClosePurchaseOrderUseCase } from "../../src/modules/purchasing/application/use-cases/close-purchase-order.use-case";
import { CancelPurchaseOrderUseCase } from "../../src/modules/purchasing/application/use-cases/cancel-purchase-order.use-case";
import { CreatePurchaseReceiptUseCase } from "../../src/modules/purchasing/application/use-cases/create-purchase-receipt.use-case";
import { CreatePurchaseReturnUseCase } from "../../src/modules/purchasing/application/use-cases/create-purchase-return.use-case";
import { GetPurchaseOrderUseCase } from "../../src/modules/purchasing/application/use-cases/get-purchase-order.use-case";
import { PurchaseOrderHasReceiptsError, PurchaseReceiptExceedsOrderedQuantityError } from "../../src/modules/purchasing/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Purchasing Integration Owner",
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
  const suppliers = new PrismaSupplierRepository(prisma);
  const balances = new PrismaInventoryBalanceRepository(prisma);

  const now = new Date("2026-09-01T00:00:00.000Z");
  const owner = createUser(now, `purchasing-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `purchasing-tenant-${slugSuffix}`);
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

  const trackedProduct = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-TRACKED",
    name: "Producto Rastreado",
    unitOfMeasureId: unit.id,
    baseCost: "4.2500",
    sellable: false,
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });

  const createSupplier = new CreateSupplierUseCase(suppliers);
  const getSupplier = new GetSupplierUseCase(suppliers);
  const supplier = await createSupplier.execute({ tenantId: tenant.id, companyId: company.id, code: "SUP-1", name: "Proveedor 1" });

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);

  const purchaseOrders = new PrismaPurchaseOrderRepository(prisma);
  const purchaseOrderLines = new PrismaPurchaseOrderLineRepository(prisma);
  const purchaseReceipts = new PrismaPurchaseReceiptRepository(prisma);
  const purchaseReceiptLines = new PrismaPurchaseReceiptLineRepository(prisma);
  const purchaseReturns = new PrismaPurchaseReturnRepository(prisma);
  const purchaseReturnLines = new PrismaPurchaseReturnLineRepository(prisma);

  const resolveSupplierTarget = new ResolveSupplierTargetUseCase(getSupplier);
  const resolvePurchaseLineTarget = new ResolvePurchaseLineTargetUseCase(getProduct, getProductVariant, getWarehouse);

  return {
    tenant,
    company,
    ownerId: owner.id,
    trackedProduct,
    warehouse,
    supplier,
    balances,
    createPurchaseOrder: new CreatePurchaseOrderUseCase(purchaseOrders, resolveSupplierTarget),
    addPurchaseOrderLine: new AddPurchaseOrderLineUseCase(purchaseOrders, purchaseOrderLines, resolvePurchaseLineTarget),
    confirmPurchaseOrder: new ConfirmPurchaseOrderUseCase(purchaseOrders, purchaseOrderLines),
    closePurchaseOrder: new ClosePurchaseOrderUseCase(purchaseOrders),
    cancelPurchaseOrder: new CancelPurchaseOrderUseCase(purchaseOrders, purchaseReceipts),
    createPurchaseReceipt: new CreatePurchaseReceiptUseCase(purchaseOrders, purchaseOrderLines, purchaseReceipts, purchaseReceiptLines, recordReceipt),
    createPurchaseReturn: new CreatePurchaseReturnUseCase(purchaseOrders, purchaseOrderLines, purchaseReceiptLines, purchaseReturns, purchaseReturnLines, recordIssue),
    getPurchaseOrder: new GetPurchaseOrderUseCase(purchaseOrders),
    repositories: { purchaseOrderLines, purchaseReceiptLines, purchaseReturnLines },
  };
}

describe("Purchasing module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full PurchaseOrder -> Confirm -> partial Receipts -> Close -> Return lifecycle against real Postgres with real cross-module calls", async () => {
    const fx = await buildFixture(harness, "lifecycle");

    const order = await fx.createPurchaseOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, supplierId: fx.supplier.id, currency: "USD" });
    expect(order.status).toBe("DRAFT");

    const line = await fx.addPurchaseOrderLine.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      purchaseOrderId: order.id,
      productId: fx.trackedProduct.id,
      warehouseId: fx.warehouse.id,
      quantity: "20",
    });
    // 20 * 4.25 = 85.00, real Postgres round-trip, no ceros recortados.
    expect(line.lineTotal).toBe("85.0000");

    const confirmed = await fx.confirmPurchaseOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, purchaseOrderId: order.id });
    expect(confirmed.status).toBe("CONFIRMED");

    // First partial receipt: 12 of 20.
    await fx.createPurchaseReceipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-receipt-1",
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "12" }],
    });
    const balanceAfterFirstReceipt = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balanceAfterFirstReceipt[0].onHandQuantity).toBe("12.0000");

    // Cancelling now must be rejected — a real receipt already exists.
    await expect(
      fx.cancelPurchaseOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, purchaseOrderId: order.id }),
    ).rejects.toThrow(PurchaseOrderHasReceiptsError);

    // Second partial receipt: the remaining 8 of 20 — completes it.
    await fx.createPurchaseReceipt.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-receipt-2",
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "8" }],
    });
    const balanceAfterSecondReceipt = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balanceAfterSecondReceipt[0].onHandQuantity).toBe("20.0000");

    // A third receipt now exceeds the ordered quantity (20) even by a small amount.
    await expect(
      fx.createPurchaseReceipt.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId: fx.ownerId,
        correlationId: "corr-receipt-3",
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "0.0001" }],
      }),
    ).rejects.toThrow(PurchaseReceiptExceedsOrderedQuantityError);

    const closed = await fx.closePurchaseOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, purchaseOrderId: order.id });
    expect(closed.status).toBe("CLOSED");

    // A return against the fully-received line: goods physically going back to the supplier.
    const purchaseReturn = await fx.createPurchaseReturn.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-return",
      purchaseOrderId: order.id,
      reason: "Producto defectuoso",
      lines: [{ purchaseOrderLineId: line.id, quantity: "3" }],
    });
    const returnLines = await fx.repositories.purchaseReturnLines.listByPurchaseReturn(fx.tenant.id, purchaseReturn.id);
    expect(returnLines).toHaveLength(1);
    expect(returnLines[0].quantity).toBe("3.0000");

    const balanceAfterReturn = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balanceAfterReturn[0].onHandQuantity).toBe("17.0000");

    const receiptLines = await fx.repositories.purchaseReceiptLines.listByPurchaseOrderLine(fx.tenant.id, line.id);
    expect(receiptLines).toHaveLength(2);
  });

  it("enforces the real segregation-of-duties permission split: purchasing.orders.manage cannot approve, purchasing.orders.approve cannot create — both verified against real RoleAssignment/Permission rows", async () => {
    const fx = await buildFixture(harness, "segregation");
    const prisma = asRepositoryClient(harness.prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const permissionsRepo = new PrismaPermissionRepository(prisma);
    const roles = new PrismaRoleRepository(prisma);
    const assignments = new PrismaRoleAssignmentRepository(prisma);
    const hasPermission = new HasPermissionUseCase(assignments, roles);
    const now = new Date("2026-09-01T10:00:00.000Z");

    const buyerUser = createUser(now, "buyer@example.com");
    const approverUser = createUser(now, "approver@example.com");
    const users = new PrismaUserRepository(prisma);
    await users.save(buyerUser);
    await users.save(approverUser);

    const buyerMembership = Membership.create({ id: newId(), tenantId: fx.tenant.id, userId: buyerUser.id, status: "ACTIVE", createdAt: now, updatedAt: now });
    const approverMembership = Membership.create({ id: newId(), tenantId: fx.tenant.id, userId: approverUser.id, status: "ACTIVE", createdAt: now, updatedAt: now });
    await memberships.save(buyerMembership);
    await memberships.save(approverMembership);

    await permissionsRepo.upsert(Permission.create({ id: newId(), key: "purchasing.orders.manage", description: "Manage purchase orders", createdAt: now }));
    await permissionsRepo.upsert(Permission.create({ id: newId(), key: "purchasing.orders.approve", description: "Approve purchase orders", createdAt: now }));

    const buyerRole = Role.create({ id: newId(), tenantId: fx.tenant.id, name: "Buyer", isSystem: false, permissionKeys: ["purchasing.orders.manage"], createdAt: now, updatedAt: now });
    const approverRole = Role.create({ id: newId(), tenantId: fx.tenant.id, name: "Approver", isSystem: false, permissionKeys: ["purchasing.orders.approve"], createdAt: now, updatedAt: now });
    await roles.save(buyerRole);
    await roles.save(approverRole);

    await assignments.save(RoleAssignment.create({ id: newId(), tenantId: fx.tenant.id, membershipId: buyerMembership.id, roleId: buyerRole.id, scopeType: "TENANT", scopeId: null, createdAt: now }));
    await assignments.save(RoleAssignment.create({ id: newId(), tenantId: fx.tenant.id, membershipId: approverMembership.id, roleId: approverRole.id, scopeType: "TENANT", scopeId: null, createdAt: now }));

    // The buyer can manage (create/add-line/close/cancel) but cannot approve.
    await expect(hasPermission.execute({ tenantId: fx.tenant.id, membershipId: buyerMembership.id, permissionKey: "purchasing.orders.manage" })).resolves.toBe(true);
    await expect(hasPermission.execute({ tenantId: fx.tenant.id, membershipId: buyerMembership.id, permissionKey: "purchasing.orders.approve" })).resolves.toBe(false);

    // The approver can approve but cannot manage (create/add-line/close/cancel).
    await expect(hasPermission.execute({ tenantId: fx.tenant.id, membershipId: approverMembership.id, permissionKey: "purchasing.orders.approve" })).resolves.toBe(true);
    await expect(hasPermission.execute({ tenantId: fx.tenant.id, membershipId: approverMembership.id, permissionKey: "purchasing.orders.manage" })).resolves.toBe(false);
  });
});
