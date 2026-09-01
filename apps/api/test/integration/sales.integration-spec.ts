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
import { PrismaTaxRepository } from "../../src/modules/taxes/infrastructure/prisma-tax.repository";
import { GetTaxUseCase } from "../../src/modules/taxes/application/use-cases/get-tax.use-case";
import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "../../src/modules/customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../src/modules/customers/application/use-cases/get-customer.use-case";
import { PrismaPriceListItemRepository } from "../../src/modules/pricing/infrastructure/prisma-price-list-item.repository";
import { GetPriceListItemUseCase } from "../../src/modules/pricing/application/use-cases/get-price-list-item.use-case";
import { PrismaInventoryBalanceRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-balance.repository";
import { PrismaInventoryReservationRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-reservation.repository";
import { ResolveWarehouseTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "../../src/modules/inventory/application/use-cases/record-receipt.use-case";
import { RecordIssueUseCase } from "../../src/modules/inventory/application/use-cases/record-issue.use-case";
import { RecordReturnUseCase } from "../../src/modules/inventory/application/use-cases/record-return.use-case";
import { CreateReservationUseCase } from "../../src/modules/inventory/application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "../../src/modules/inventory/application/use-cases/release-reservation.use-case";
import { PrismaQuoteRepository } from "../../src/modules/sales/infrastructure/prisma-quote.repository";
import { PrismaQuoteLineRepository } from "../../src/modules/sales/infrastructure/prisma-quote-line.repository";
import { PrismaSalesOrderRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order.repository";
import { PrismaSalesOrderLineRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order-line.repository";
import { PrismaSalesReturnRepository } from "../../src/modules/sales/infrastructure/prisma-sales-return.repository";
import { PrismaSalesReturnLineRepository } from "../../src/modules/sales/infrastructure/prisma-sales-return-line.repository";
import { ResolveCustomerTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-customer-target.use-case";
import { ResolveSalesLineTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-sales-line-target.use-case";
import { CreateQuoteUseCase } from "../../src/modules/sales/application/use-cases/create-quote.use-case";
import { AddQuoteLineUseCase } from "../../src/modules/sales/application/use-cases/add-quote-line.use-case";
import { ConvertQuoteToSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/convert-quote-to-sales-order.use-case";
import { CreateSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "../../src/modules/sales/application/use-cases/add-sales-order-line.use-case";
import { ConfirmSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/confirm-sales-order.use-case";
import { FulfillSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/fulfill-sales-order.use-case";
import { CreateSalesReturnUseCase } from "../../src/modules/sales/application/use-cases/create-sales-return.use-case";
import { GetSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/get-sales-order.use-case";
import { InsufficientInventoryForOrderError } from "../../src/modules/sales/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Sales Integration Owner",
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
  const taxes = new PrismaTaxRepository(prisma);
  const customers = new PrismaCustomerRepository(prisma);
  const balances = new PrismaInventoryBalanceRepository(prisma);
  const reservations = new PrismaInventoryReservationRepository(prisma);

  const now = new Date("2026-08-31T00:00:00.000Z");
  const owner = createUser(now, `sales-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `sales-tenant-${slugSuffix}`);
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
    basePrice: "10.5000",
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });

  const getTax = new GetTaxUseCase(taxes);

  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const customer = await createCustomer.execute({ tenantId: tenant.id, companyId: company.id, code: "CUST-1", name: "Cliente 1" });

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReturn = new RecordReturnUseCase(balances, resolveWarehouse, resolveProduct);
  const createReservation = new CreateReservationUseCase(balances, reservations, resolveWarehouse, resolveProduct);
  const releaseReservation = new ReleaseReservationUseCase(reservations, balances);

  const quotes = new PrismaQuoteRepository(prisma);
  const quoteLines = new PrismaQuoteLineRepository(prisma);
  const salesOrders = new PrismaSalesOrderRepository(prisma);
  const salesOrderLines = new PrismaSalesOrderLineRepository(prisma);
  const salesReturns = new PrismaSalesReturnRepository(prisma);
  const salesReturnLines = new PrismaSalesReturnLineRepository(prisma);

  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const resolveSalesLineTarget = new ResolveSalesLineTargetUseCase(getProduct, getProductVariant, getWarehouse, getTax);
  const getPriceListItem = new GetPriceListItemUseCase(new PrismaPriceListItemRepository(prisma));

  return {
    tenant,
    company,
    ownerId: owner.id,
    trackedProduct,
    warehouse,
    customer,
    balances,
    reservations,
    async receiveStock(quantity: string) {
      await recordReceipt.execute({
        tenantId: tenant.id,
        companyId: company.id,
        actorUserId: owner.id,
        correlationId: `receipt-${newId()}`,
        warehouseId: warehouse.id,
        productId: trackedProduct.id,
        quantity,
      });
    },
    createQuote: new CreateQuoteUseCase(quotes, resolveCustomerTarget),
    addQuoteLine: new AddQuoteLineUseCase(quotes, quoteLines, resolveSalesLineTarget, getPriceListItem),
    convertQuote: new ConvertQuoteToSalesOrderUseCase(quotes, quoteLines, salesOrders, salesOrderLines, getProduct),
    createSalesOrder: new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget),
    addSalesOrderLine: new AddSalesOrderLineUseCase(salesOrders, salesOrderLines, resolveSalesLineTarget, getPriceListItem),
    confirmSalesOrder: new ConfirmSalesOrderUseCase(salesOrders, salesOrderLines, createReservation, releaseReservation),
    fulfillSalesOrder: new FulfillSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation, recordIssue),
    createSalesReturn: new CreateSalesReturnUseCase(salesOrders, salesOrderLines, salesReturns, salesReturnLines, recordReturn),
    getSalesOrder: new GetSalesOrderUseCase(salesOrders),
    repositories: { salesOrderLines, salesReturnLines },
  };
}

describe("Sales module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full Quote -> SalesOrder -> Confirm -> Fulfill -> Return lifecycle against real Postgres with real cross-module calls", async () => {
    const fx = await buildFixture(harness, "lifecycle");
    await fx.receiveStock("50.0000");

    const quote = await fx.createQuote.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, customerId: fx.customer.id, currency: "USD" });
    const quoteLine = await fx.addQuoteLine.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      quoteId: quote.id,
      productId: fx.trackedProduct.id,
      quantity: "3",
      discountAmount: "1.5000",
    });
    // subtotal = 3*10.5 - 1.5 = 30, no tax -> lineTotal 30.0000, real Postgres round-trip.
    expect(quoteLine.lineTotal).toBe("30.0000");

    const order = await fx.convertQuote.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, quoteId: quote.id, warehouseId: fx.warehouse.id });
    expect(order.status).toBe("DRAFT");
    expect(order.quoteId).toBe(quote.id);

    const [orderLine] = await fx.repositories.salesOrderLines.listBySalesOrder(fx.tenant.id, order.id);
    expect(orderLine.lineTotal).toBe(quoteLine.lineTotal);
    expect(orderLine.warehouseId).toBe(fx.warehouse.id);

    const confirmed = await fx.confirmSalesOrder.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-confirm",
      salesOrderId: order.id,
    });
    expect(confirmed.status).toBe("CONFIRMED");

    const balancesAfterConfirm = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balancesAfterConfirm[0].reservedQuantity).toBe("3.0000");
    expect(balancesAfterConfirm[0].availableQuantity).toBe("47.0000");

    const fulfilled = await fx.fulfillSalesOrder.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-fulfill",
      salesOrderId: order.id,
    });
    expect(fulfilled.status).toBe("FULFILLED");

    const balancesAfterFulfill = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balancesAfterFulfill[0].onHandQuantity).toBe("47.0000");
    expect(balancesAfterFulfill[0].reservedQuantity).toBe("0.0000");

    const [reloadedOrderLine] = await fx.repositories.salesOrderLines.listBySalesOrder(fx.tenant.id, order.id);
    const salesReturn = await fx.createSalesReturn.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: "corr-return",
      salesOrderId: order.id,
      reason: "Cliente cambió de opinión",
      lines: [{ salesOrderLineId: reloadedOrderLine.id, quantity: "1" }],
    });
    const returnLines = await fx.repositories.salesReturnLines.listBySalesReturn(fx.tenant.id, salesReturn.id);
    expect(returnLines).toHaveLength(1);
    expect(returnLines[0].quantity).toBe("1.0000");

    const balancesAfterReturn = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balancesAfterReturn[0].onHandQuantity).toBe("48.0000");
  });

  it("compensates a partially-reserved confirm attempt against real Postgres: every reservation made in the failed attempt is released", async () => {
    const fx = await buildFixture(harness, "compensation");
    await fx.receiveStock("4.0000");

    const order = await fx.createSalesOrder.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, customerId: fx.customer.id, currency: "USD" });
    await fx.addSalesOrderLine.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      salesOrderId: order.id,
      productId: fx.trackedProduct.id,
      warehouseId: fx.warehouse.id,
      quantity: "4",
    });
    await fx.addSalesOrderLine.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      salesOrderId: order.id,
      productId: fx.trackedProduct.id,
      warehouseId: fx.warehouse.id,
      quantity: "2",
    });

    await expect(
      fx.confirmSalesOrder.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId: fx.ownerId,
        correlationId: "corr-confirm-fail",
        salesOrderId: order.id,
      }),
    ).rejects.toThrow(InsufficientInventoryForOrderError);

    const balancesAfterFailedConfirm = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balancesAfterFailedConfirm[0].onHandQuantity).toBe("4.0000");
    expect(balancesAfterFailedConfirm[0].reservedQuantity).toBe("0.0000");
    expect(balancesAfterFailedConfirm[0].availableQuantity).toBe("4.0000");

    const lines = await fx.repositories.salesOrderLines.listBySalesOrder(fx.tenant.id, order.id);
    for (const line of lines) {
      expect(line.reservationId).toBeNull();
    }

    const reloadedOrder = await fx.getSalesOrder.execute(fx.tenant.id, order.id);
    expect(reloadedOrder!.status).toBe("DRAFT");
  });
});
