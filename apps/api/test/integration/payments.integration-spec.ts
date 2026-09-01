import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "../../src/modules/customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../src/modules/customers/application/use-cases/get-customer.use-case";
import { PrismaSalesOrderRepository } from "../../src/modules/sales/infrastructure/prisma-sales-order.repository";
import { ResolveCustomerTargetUseCase } from "../../src/modules/sales/application/use-cases/resolve-customer-target.use-case";
import { CreateSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/create-sales-order.use-case";
import { GetSalesOrderUseCase } from "../../src/modules/sales/application/use-cases/get-sales-order.use-case";
import { PrismaPaymentRepository } from "../../src/modules/payments/infrastructure/prisma-payment.repository";
import { CashPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../src/modules/payments/infrastructure/bank-transfer-payment-gateway.adapter";
import { CapturePaymentUseCase } from "../../src/modules/payments/application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "../../src/modules/payments/application/use-cases/refund-payment.use-case";
import { ListPaymentsUseCase } from "../../src/modules/payments/application/use-cases/list-payments.use-case";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Payments Integration Owner",
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
  const customers = new PrismaCustomerRepository(prisma);
  const salesOrders = new PrismaSalesOrderRepository(prisma);
  const payments = new PrismaPaymentRepository(prisma);

  const now = new Date("2026-08-31T00:00:00.000Z");
  const owner = createUser(now, `payments-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `payments-tenant-${slugSuffix}`);
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

  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const customer = await createCustomer.execute({ tenantId: tenant.id, companyId: company.id, code: "CUST-1", name: "Cliente 1" });

  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const createSalesOrder = new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget);
  const getSalesOrder = new GetSalesOrderUseCase(salesOrders);
  const order = await createSalesOrder.execute({ tenantId: tenant.id, companyId: company.id, customerId: customer.id, currency: "USD" });

  const gateways = [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];

  return {
    tenant,
    company,
    ownerId: owner.id,
    order,
    capturePayment: new CapturePaymentUseCase(payments, gateways, getSalesOrder),
    refundPayment: new RefundPaymentUseCase(payments, gateways),
    listPayments: new ListPaymentsUseCase(payments),
    repositories: { payments },
  };
}

describe("Payments module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("captures and refunds a CASH payment with a real decimal round-trip and real audit-free traceability", async () => {
    const fx = await buildFixture(harness, "lifecycle");

    const { payment: captured } = await fx.capturePayment.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      salesOrderId: fx.order.id,
      method: "CASH",
      amount: "199.9900",
      currency: "USD",
      idempotencyKey: `capture-${newId()}`,
    });
    expect(captured.status).toBe("CAPTURED");
    expect(captured.amount).toBe("199.9900"); // real numeric(14,4) round-trip, no trailing-zero loss

    const refunded = await fx.refundPayment.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, paymentId: captured.id });
    expect(refunded.status).toBe("REFUNDED");

    const listed = await fx.listPayments.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, filter: { limit: 50 } });
    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe("REFUNDED");

    // Cross-tenant isolation: a fresh random tenant id never sees this row.
    const otherTenantView = await fx.listPayments.execute({ tenantId: newId(), companyId: fx.company.id, filter: { limit: 50 } });
    expect(otherTenantView).toHaveLength(0);
  });

  it("rejects a BANK_TRANSFER capture with no reference as a real FAILED row, not an exception", async () => {
    const fx = await buildFixture(harness, "bank-transfer-fail");
    const { payment } = await fx.capturePayment.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      salesOrderId: fx.order.id,
      method: "BANK_TRANSFER",
      amount: "50.0000",
      currency: "USD",
      idempotencyKey: `capture-${newId()}`,
    });
    expect(payment.status).toBe("FAILED");
    expect(payment.failureReason).toBe("A bank transfer reference is required.");
  });

  it("enforces the real @@unique([tenantId, companyId, idempotencyKey]) constraint under genuinely concurrent capture requests: exactly one Payment row is ever created", async () => {
    const fx = await buildFixture(harness, "idempotency-race");
    const idempotencyKey = `race-${newId()}`;

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        fx.capturePayment.execute({
          tenantId: fx.tenant.id,
          companyId: fx.company.id,
          salesOrderId: fx.order.id,
          method: "CASH",
          amount: "75.0000",
          currency: "USD",
          idempotencyKey,
        }),
      ),
    );

    // Every attempt resolves successfully — CapturePaymentUseCase never lets
    // the real unique-constraint race surface as an error to the caller.
    const fulfilled = attempts.filter((a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof fx.capturePayment.execute>>> => a.status === "fulfilled");
    expect(fulfilled).toHaveLength(5);

    // All five resolved to the exact same Payment id — the real DB decided
    // exactly one winner, and every loser's use case call re-fetched it.
    const distinctIds = new Set(fulfilled.map((f) => f.value.payment.id));
    expect(distinctIds.size).toBe(1);

    // Exactly one of the five attempts actually created the row; the other
    // four were genuine replays reacting to the real unique-constraint race.
    const replayCount = fulfilled.filter((f) => f.value.wasReplayed).length;
    expect(replayCount).toBe(4);

    const rows = await fx.repositories.payments.listByCompany(fx.tenant.id, fx.company.id, { limit: 50 });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe("75.0000");
  }, 30_000);
});
