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
import { PrismaSalesOrderRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order.repository";
import { PrismaSalesOrderLineRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order-line.repository";
import { PrismaSalesReturnRepository } from "../../src/modules/sales/infrastructure/prisma-sales-return.repository";
import { PrismaSalesReturnLineRepository } from "../../src/modules/sales/infrastructure/prisma-sales-return-line.repository";
import { ResolveCustomerTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-customer-target.use-case";
import { ResolveSalesLineTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-sales-line-target.use-case";
import { CreateSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "../../src/modules/sales/application/use-cases/add-sales-order-line.use-case";
import { ConfirmSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/confirm-sales-order.use-case";
import { CancelSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/cancel-sales-order.use-case";
import { FulfillSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/fulfill-sales-order.use-case";
import { CreateSalesReturnUseCase } from "../../src/modules/sales/application/use-cases/create-sales-return.use-case";
import { ListSalesOrderLinesUseCase } from "../../src/modules/sales/application/use-cases/list-sales-order-lines.use-case";
import { GetSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/get-sales-order.use-case";
import { PrismaPaymentRepository } from "../../src/modules/payments/infrastructure/prisma-payment.repository";
import { CashPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/bank-transfer-payment-gateway.adapter";
import { CapturePaymentUseCase } from "../../src/modules/payments/application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "../../src/modules/payments/application/use-cases/refund-payment.use-case";
import { PrismaPosRegisterRepository } from "../../src/modules/pos/infrastructure/prisma-pos-register.repository";
import { PrismaPosShiftRepository } from "../../src/modules/pos/infrastructure/prisma-pos-shift.repository";
import { PrismaPosCashMovementRepository } from "../../src/modules/pos/infrastructure/prisma-pos-cash-movement.repository";
import { PrismaPosSaleRepository } from "../../src/modules/pos/infrastructure/prisma-pos-sale.repository";
import { PrismaPosReturnRepository } from "../../src/modules/pos/infrastructure/prisma-pos-return.repository";
import { CreatePosRegisterUseCase } from "../../src/modules/pos/application/use-cases/create-pos-register.use-case";
import { OpenShiftUseCase } from "../../src/modules/pos/application/use-cases/open-shift.use-case";
import { CloseShiftUseCase } from "../../src/modules/pos/application/use-cases/close-shift.use-case";
import { RecordCashMovementUseCase } from "../../src/modules/pos/application/use-cases/record-cash-movement.use-case";
import { RingUpSaleUseCase } from "../../src/modules/pos/application/use-cases/ring-up-sale.use-case";
import { CreatePosReturnUseCase } from "../../src/modules/pos/application/use-cases/create-pos-return.use-case";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "POS Integration Owner",
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

  const now = new Date("2026-09-01T00:00:00.000Z");
  const owner = createUser(now, `pos-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `pos-tenant-${slugSuffix}`);
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
    basePrice: "10.0000",
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: tenant.id, companyId: company.id, code: "WH-1", name: "Bodega 1" });

  const getTax = new GetTaxUseCase(taxes);
  const createCustomer = new CreateCustomerUseCase(customers);
  const customer = await createCustomer.execute({ tenantId: tenant.id, companyId: company.id, code: "CUST-1", name: "Cliente 1" });
  const getCustomer = new GetCustomerUseCase(customers);

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReturn = new RecordReturnUseCase(balances, resolveWarehouse, resolveProduct);
  const createReservation = new CreateReservationUseCase(balances, reservations, resolveWarehouse, resolveProduct);
  const releaseReservation = new ReleaseReservationUseCase(reservations, balances);

  const salesOrders = new PrismaSalesOrderRepository(prisma);
  const salesOrderLines = new PrismaSalesOrderLineRepository(prisma);
  const salesReturns = new PrismaSalesReturnRepository(prisma);
  const salesReturnLines = new PrismaSalesReturnLineRepository(prisma);

  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const resolveSalesLineTarget = new ResolveSalesLineTargetUseCase(getProduct, getProductVariant, getWarehouse, getTax);
  const getPriceListItem = new GetPriceListItemUseCase(new PrismaPriceListItemRepository(prisma));

  const createSalesOrder = new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget);
  const addSalesOrderLine = new AddSalesOrderLineUseCase(salesOrders, salesOrderLines, resolveSalesLineTarget, getPriceListItem);
  const confirmSalesOrder = new ConfirmSalesOrderUseCase(salesOrders, salesOrderLines, createReservation, releaseReservation);
  const cancelSalesOrder = new CancelSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation);
  const fulfillSalesOrder = new FulfillSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation, recordIssue);
  const createSalesReturn = new CreateSalesReturnUseCase(salesOrders, salesOrderLines, salesReturns, salesReturnLines, recordReturn);
  const listSalesOrderLines = new ListSalesOrderLinesUseCase(salesOrders, salesOrderLines);
  const getSalesOrder = new GetSalesOrderUseCase(salesOrders);

  const payments = new PrismaPaymentRepository(prisma);
  const gateways = [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];
  const capturePayment = new CapturePaymentUseCase(payments, gateways, getSalesOrder);
  const refundPayment = new RefundPaymentUseCase(payments, gateways);

  const posRegisters = new PrismaPosRegisterRepository(prisma);
  const posShifts = new PrismaPosShiftRepository(prisma);
  const posCashMovements = new PrismaPosCashMovementRepository(prisma);
  const posSales = new PrismaPosSaleRepository(prisma);
  const posReturns = new PrismaPosReturnRepository(prisma);

  const createRegister = new CreatePosRegisterUseCase(posRegisters, getWarehouse);
  const register = await createRegister.execute({ tenantId: tenant.id, companyId: company.id, warehouseId: warehouse.id, code: "REG-1", name: "Caja 1" });

  const openShift = new OpenShiftUseCase(posShifts, posRegisters);
  const closeShift = new CloseShiftUseCase(posShifts, posCashMovements, posSales, posReturns);
  const recordCashMovement = new RecordCashMovementUseCase(posCashMovements, posShifts);
  const ringUpSale = new RingUpSaleUseCase(
    posSales,
    posShifts,
    posRegisters,
    createSalesOrder,
    addSalesOrderLine,
    confirmSalesOrder,
    cancelSalesOrder,
    fulfillSalesOrder,
    listSalesOrderLines,
    capturePayment,
  );
  const createPosReturn = new CreatePosReturnUseCase(posReturns, posSales, posShifts, createSalesReturn, refundPayment);

  return {
    tenant,
    company,
    ownerId: owner.id,
    trackedProduct,
    warehouse,
    customer,
    register,
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
    openShift,
    closeShift,
    recordCashMovement,
    ringUpSale,
    createPosReturn,
    listSalesOrderLines,
    repositories: { posSales, posReturns, salesOrderLines },
  };
}

describe("POS module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full Register -> Shift -> RingUpSale -> CashMovement -> Return -> Close lifecycle against real Postgres with real cross-module calls into Sales/Payments/Inventory", async () => {
    const fx = await buildFixture(harness, "lifecycle");
    await fx.receiveStock("20");

    const shift = await fx.openShift.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, actorUserId: fx.ownerId, registerId: fx.register.id, openingCash: "50.0000" });
    expect(shift.status).toBe("OPEN");

    await fx.recordCashMovement.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, actorUserId: fx.ownerId, shiftId: shift.id, type: "CASH_IN", amount: "20", reason: "Fondo adicional" });

    const { posSale, wasReplayed } = await fx.ringUpSale.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: `corr-${newId()}`,
      shiftId: shift.id,
      customerId: fx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      amountTendered: "50.0000",
      idempotencyKey: `ring-${newId()}`,
      lines: [{ productId: fx.trackedProduct.id, quantity: "3" }],
    });
    expect(wasReplayed).toBe(false);
    // 3 * 10.0000 = 30.0000, a real Postgres round-trip, no trailing-zero loss.
    expect(posSale.amount).toBe("30.0000");
    expect(posSale.changeDue).toBe("20.0000");

    const balanceAfterSale = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balanceAfterSale[0].onHandQuantity).toBe("17.0000");

    const [orderLine] = await fx.repositories.salesOrderLines.listBySalesOrder(fx.tenant.id, posSale.salesOrderId);
    const { posReturn } = await fx.createPosReturn.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      correlationId: `corr-return-${newId()}`,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "1" }],
      issueRefund: false,
      idempotencyKey: `return-${newId()}`,
    });
    expect(posReturn.refunded).toBe(false);

    const balanceAfterReturn = await fx.balances.listByCompany(fx.tenant.id, fx.company.id, {
      warehouseId: fx.warehouse.id,
      productId: fx.trackedProduct.id,
      productVariantId: null,
    });
    expect(balanceAfterReturn[0].onHandQuantity).toBe("18.0000");

    // 50 (opening) + 20 (cash-in) + 30 (CASH sale) = 100 — the goods-only
    // return has no cash effect since issueRefund was false.
    const closed = await fx.closeShift.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, actorUserId: fx.ownerId, shiftId: shift.id, closingCashCounted: "100.0000" });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closingCashExpected).toBe("100.0000");
    expect(closed.cashVariance).toBe("0.0000");

    const sales = await fx.repositories.posSales.listByShift(fx.tenant.id, shift.id);
    expect(sales).toHaveLength(1);
    const returns = await fx.repositories.posReturns.listByShift(fx.tenant.id, shift.id);
    expect(returns).toHaveLength(1);
  });

  it("enforces the real @@unique([tenantId, companyId, idempotencyKey]) constraint under genuinely concurrent ring-up requests: exactly one PosSale ever survives, and every caller converges on it", async () => {
    // RingUpSaleUseCase's own idempotency pre-check runs before any real
    // work, so it fully dedupes the realistic case a terminal retry
    // actually produces: a *sequential* resend after losing the response
    // (see the previous test's `wasReplayed` coverage in the unit suite).
    // Under a genuinely *simultaneous* multi-request race — every
    // concurrent caller passes that pre-check before any of them commits —
    // each one independently creates and fulfills its own real SalesOrder,
    // exactly like Payments' own capture race (its `capturePayment` calls
    // still converge on one winning Payment via the real unique-constraint
    // + re-fetch, per `payments.integration-spec.ts`). What THIS layer
    // guarantees, verified below, is that only one `PosSale` row is ever
    // written and every racer's result converges on it — not that only one
    // underlying `SalesOrder` gets created. A fuller fix (claiming the
    // idempotency key before any Sales/Payments call, mirroring the inbox's
    // claim-then-effect pattern) is deliberately out of scope for this
    // phase — see docs/SECURITY.md "POS" Known limitations.
    const fx = await buildFixture(harness, "idempotency-race");
    await fx.receiveStock("50");
    const shift = await fx.openShift.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, actorUserId: fx.ownerId, registerId: fx.register.id, openingCash: "0" });
    const idempotencyKey = `race-${newId()}`;

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        fx.ringUpSale.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          actorUserId: fx.ownerId,
          correlationId: `corr-${newId()}`,
          shiftId: shift.id,
          customerId: fx.customer.id,
          currency: "USD",
          paymentMethod: "CASH",
          idempotencyKey,
          lines: [{ productId: fx.trackedProduct.id, quantity: "1" }],
        }),
      ),
    );

    const fulfilled = attempts.filter((a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof fx.ringUpSale.execute>>> => a.status === "fulfilled");
    expect(fulfilled).toHaveLength(5);

    const distinctIds = new Set(fulfilled.map((f) => f.value.posSale.id));
    expect(distinctIds.size).toBe(1);

    const replayCount = fulfilled.filter((f) => f.value.wasReplayed).length;
    expect(replayCount).toBe(4);

    const rows = await fx.repositories.posSales.listByShift(fx.tenant.id, shift.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe("10.0000");
  }, 30_000);
});
