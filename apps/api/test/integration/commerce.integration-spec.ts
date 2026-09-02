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
import { GetTaxUseCase } from "../../src/modules/taxes/application/use-cases/get-tax.use-case";
import { PrismaTaxRepository } from "../../src/modules/taxes/infrastructure/prisma-tax.repository";
import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "../../src/modules/customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../src/modules/customers/application/use-cases/get-customer.use-case";
import { FindCustomerByEmailUseCase } from "../../src/modules/customers/application/use-cases/find-customer-by-email.use-case";
import { PrismaPriceListItemRepository } from "../../src/modules/pricing/infrastructure/prisma-price-list-item.repository";
import { GetPriceListItemUseCase } from "../../src/modules/pricing/application/use-cases/get-price-list-item.use-case";
import { PrismaInventoryBalanceRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-balance.repository";
import { PrismaInventoryReservationRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-reservation.repository";
import { ResolveWarehouseTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../src/modules/inventory/application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "../../src/modules/inventory/application/use-cases/record-receipt.use-case";
import { CreateReservationUseCase } from "../../src/modules/inventory/application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "../../src/modules/inventory/application/use-cases/release-reservation.use-case";
import { PrismaSalesOrderRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order.repository";
import { PrismaSalesOrderLineRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order-line.repository";
import { ResolveCustomerTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-customer-target.use-case";
import { ResolveSalesLineTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-sales-line-target.use-case";
import { CreateSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "../../src/modules/sales/application/use-cases/add-sales-order-line.use-case";
import { ConfirmSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/confirm-sales-order.use-case";
import { CancelSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/cancel-sales-order.use-case";
import { ListSalesOrderLinesUseCase } from "../../src/modules/sales/application/use-cases/list-sales-order-lines.use-case";
import { GetSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/get-sales-order.use-case";
import { PrismaPaymentRepository } from "../../src/modules/payments/infrastructure/prisma-payment.repository";
import { CashPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/bank-transfer-payment-gateway.adapter";
import { CapturePaymentUseCase } from "../../src/modules/payments/application/use-cases/capture-payment.use-case";
import { PrismaStorefrontRepository } from "../../src/modules/commerce/infrastructure/prisma-storefront.repository";
import { PrismaStorefrontProductRepository } from "../../src/modules/commerce/infrastructure/prisma-storefront-product.repository";
import { PrismaCartRepository } from "../../src/modules/commerce/infrastructure/prisma-cart.repository";
import { PrismaCartLineRepository } from "../../src/modules/commerce/infrastructure/prisma-cart-line.repository";
import { PrismaCommerceOrderRepository } from "../../src/modules/commerce/infrastructure/prisma-commerce-order.repository";
import { StorefrontSystemUserSeeder } from "../../src/modules/commerce/application/storefront-system-user-seeder";
import { CreateStorefrontUseCase } from "../../src/modules/commerce/application/use-cases/create-storefront.use-case";
import { PublishProductUseCase } from "../../src/modules/commerce/application/use-cases/publish-product.use-case";
import { ListPublishedProductsUseCase } from "../../src/modules/commerce/application/use-cases/list-published-products.use-case";
import { GetOrCreateCartUseCase } from "../../src/modules/commerce/application/use-cases/get-or-create-cart.use-case";
import { AddCartLineUseCase } from "../../src/modules/commerce/application/use-cases/add-cart-line.use-case";
import { CheckoutUseCase } from "../../src/modules/commerce/application/use-cases/checkout.use-case";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({ id: newId(), email, displayName: "Commerce Integration Owner", status: "ACTIVE", isPlatformAdmin: false, createdAt: now, updatedAt: now });
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

  const now = new Date("2026-09-02T00:00:00.000Z");
  const owner = createUser(now, `commerce-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `commerce-tenant-${slugSuffix}`);
  await users.save(owner);
  await tenants.save(tenant);

  const org = Organization.create({ id: newId(), tenantId: tenant.id, code: "HQ", name: "HQ", status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
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

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({ tenantId: tenant.id, companyId: company.id, code: "UN", name: "Unidad", symbol: "u" });
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const getProduct = new GetProductUseCase(products);
  const getProductVariant = new GetProductVariantUseCase(variants);
  const trackedProduct = await createProduct.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: "SKU-TRACKED",
    name: "Producto Rastreado",
    unitOfMeasureId: unit.id,
    basePrice: "25.0000",
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });

  const getTax = new GetTaxUseCase(taxes);
  const getCustomer = new GetCustomerUseCase(customers);
  const createCustomer = new CreateCustomerUseCase(customers);
  const findCustomerByEmail = new FindCustomerByEmailUseCase(customers);

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);
  const createReservation = new CreateReservationUseCase(balances, reservations, resolveWarehouse, resolveProduct);
  const releaseReservation = new ReleaseReservationUseCase(reservations, balances);

  const salesOrders = new PrismaSalesOrderRepository(prisma);
  const salesOrderLines = new PrismaSalesOrderLineRepository(prisma);

  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const resolveSalesLineTarget = new ResolveSalesLineTargetUseCase(getProduct, getProductVariant, getWarehouse, getTax);
  const getPriceListItem = new GetPriceListItemUseCase(new PrismaPriceListItemRepository(prisma));

  const createSalesOrder = new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget);
  const addSalesOrderLine = new AddSalesOrderLineUseCase(salesOrders, salesOrderLines, resolveSalesLineTarget, getPriceListItem);
  const confirmSalesOrder = new ConfirmSalesOrderUseCase(salesOrders, salesOrderLines, createReservation, releaseReservation);
  const cancelSalesOrder = new CancelSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation);
  const listSalesOrderLines = new ListSalesOrderLinesUseCase(salesOrders, salesOrderLines);
  const getSalesOrder = new GetSalesOrderUseCase(salesOrders);

  const payments = new PrismaPaymentRepository(prisma);
  const gateways = [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];
  const capturePayment = new CapturePaymentUseCase(payments, gateways, getSalesOrder);

  const systemUserSeeder = new StorefrontSystemUserSeeder(users);

  const storefronts = new PrismaStorefrontRepository(prisma);
  const storefrontProducts = new PrismaStorefrontProductRepository(prisma);
  const carts = new PrismaCartRepository(prisma);
  const cartLines = new PrismaCartLineRepository(prisma);
  const commerceOrders = new PrismaCommerceOrderRepository(prisma);

  const createStorefront = new CreateStorefrontUseCase(storefronts, getWarehouse);
  const storefront = await createStorefront.execute({
    tenantId: tenant.id,
    companyId: company.id,
    code: `store-${slugSuffix}-${newId().slice(0, 8)}`,
    name: "Tienda de prueba",
    currency: "USD",
    defaultWarehouseId: warehouse.id,
  });

  const publishProduct = new PublishProductUseCase(storefrontProducts, storefronts, getProduct);
  await publishProduct.execute({ tenantId: tenant.id, companyId: company.id, storefrontId: storefront.id, productId: trackedProduct.id });

  const listPublishedProducts = new ListPublishedProductsUseCase(storefrontProducts, storefronts, getProduct);
  const getOrCreateCart = new GetOrCreateCartUseCase(carts);
  const addCartLine = new AddCartLineUseCase(carts, cartLines, storefrontProducts, getProduct, getProductVariant);
  const checkout = new CheckoutUseCase(
    commerceOrders,
    carts,
    cartLines,
    findCustomerByEmail,
    createCustomer,
    systemUserSeeder,
    createSalesOrder,
    addSalesOrderLine,
    confirmSalesOrder,
    cancelSalesOrder,
    listSalesOrderLines,
    capturePayment,
  );

  return {
    tenant,
    company,
    ownerId: owner.id,
    trackedProduct,
    warehouse,
    storefront,
    balances,
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
    listPublishedProducts,
    getOrCreateCart,
    addCartLine,
    checkout,
    repositories: { commerceOrders, carts, users: { findByEmail: (e: string) => users.findByEmail(e) } },
  };
}

describe("Commerce module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full Storefront -> publish -> Cart -> Checkout lifecycle against real Postgres with real cross-module calls into Sales/Payments/Inventory", async () => {
    const fx = await buildFixture(harness, "lifecycle");
    await fx.receiveStock("20");

    const publicListing = await fx.listPublishedProducts.execute({ storefrontCode: fx.storefront.code, limit: 50 });
    expect(publicListing.map((p) => p.productId)).toContain(fx.trackedProduct.id);

    const cart = await fx.getOrCreateCart.execute({ storefront: fx.storefront, cartId: null });
    await fx.addCartLine.execute({ storefront: fx.storefront, cartId: cart.id, productId: fx.trackedProduct.id, quantity: "3.0000" });

    const { order, wasReplayed } = await fx.checkout.execute({
      storefront: fx.storefront,
      correlationId: `corr-${newId()}`,
      cartId: cart.id,
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      paymentReference: "TRX-REAL-1",
    });
    expect(wasReplayed).toBe(false);
    // 3 * 25.0000 = 75.0000 — a real Postgres round-trip, no trailing-zero loss.
    expect(order.total).toBe("75.0000");
    expect(order.paymentId).not.toBeNull();

    const balanceAfterCheckout = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    // Confirmed but never fulfilled here — inventory is RESERVED, not yet ISSUED.
    expect(balanceAfterCheckout[0].onHandQuantity).toBe("20.0000");
    expect(balanceAfterCheckout[0].reservedQuantity).toBe("3.0000");

    const systemUser = await fx.repositories.users.findByEmail("storefront-system@platform.internal");
    expect(systemUser).not.toBeNull();

    const cartRow = await fx.repositories.carts.findById(fx.tenant.id, cart.id);
    expect(cartRow?.status).toBe("CONVERTED");
  });

  it("enforces the real @@unique([tenantId, cartId]) constraint under genuinely concurrent checkout requests: exactly one CommerceOrder ever survives, and every caller converges on it", async () => {
    // CheckoutUseCase's own idempotency pre-check runs once, at the top,
    // before any real Sales/Payments call — exactly the same shape (and the
    // same residual concurrency window) already verified for POS's
    // RingUpSaleUseCase and documented in docs/DECISIONS.md ADR-011. What
    // this test verifies is the guarantee that DOES hold under a genuine
    // race: exactly one CommerceOrder row is ever written for this cart,
    // and every concurrent caller's result converges on it.
    const fx = await buildFixture(harness, "idempotency-race");
    await fx.receiveStock("50");
    const cart = await fx.getOrCreateCart.execute({ storefront: fx.storefront, cartId: null });
    await fx.addCartLine.execute({ storefront: fx.storefront, cartId: cart.id, productId: fx.trackedProduct.id, quantity: "1.0000" });

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        fx.checkout.execute({
          storefront: fx.storefront,
          correlationId: `corr-${newId()}`,
          cartId: cart.id,
          guestName: "Race Shopper",
          guestEmail: "race@example.com",
        }),
      ),
    );

    const fulfilled = attempts.filter((a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof fx.checkout.execute>>> => a.status === "fulfilled");
    expect(fulfilled).toHaveLength(5);

    const distinctIds = new Set(fulfilled.map((f) => f.value.order.id));
    expect(distinctIds.size).toBe(1);

    const replayCount = fulfilled.filter((f) => f.value.wasReplayed).length;
    expect(replayCount).toBe(4);

    const found = await fx.repositories.commerceOrders.findByCartId(fx.tenant.id, fx.company.id, cart.id);
    expect(found).not.toBeNull();
  }, 30_000);
});
