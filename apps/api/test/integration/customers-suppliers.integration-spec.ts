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
import { UpdateCustomerUseCase } from "../../src/modules/customers/application/use-cases/update-customer.use-case";
import { ListCustomersUseCase } from "../../src/modules/customers/application/use-cases/list-customers.use-case";
import { CustomerNotFoundError, CustomerTaxIdAlreadyInUseError } from "../../src/modules/customers/application/errors";
import { PrismaSupplierRepository } from "../../src/modules/suppliers/infrastructure/prisma-supplier.repository";
import { CreateSupplierUseCase } from "../../src/modules/suppliers/application/use-cases/create-supplier.use-case";
import { SupplierTaxIdAlreadyInUseError } from "../../src/modules/suppliers/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Customers/Suppliers Integration Owner",
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

describe("Customers/Suppliers modules against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it("enforces company scoping, real tax-id uniqueness and the update contract for customers and suppliers", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const customers = new PrismaCustomerRepository(prisma);
    const suppliers = new PrismaSupplierRepository(prisma);
    const now = new Date("2026-08-31T00:00:00.000Z");

    const owner = createUser(now, "party-owner@example.com");
    const tenantA = createTenant(now, "party-tenant-a");
    const tenantB = createTenant(now, "party-tenant-b");
    await users.save(owner);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const orgA = Organization.create({
      id: newId(),
      tenantId: tenantA.id,
      code: "HQ",
      name: "HQ",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await organizations.save(orgA);
    const companyA1 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "CO1",
      name: "Company One",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const companyA2 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "CO2",
      name: "Company Two",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(companyA1);
    await companies.save(companyA2);

    const orgB = Organization.create({
      id: newId(),
      tenantId: tenantB.id,
      code: "HQ",
      name: "HQ",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await organizations.save(orgB);
    const companyB1 = Company.create({
      id: newId(),
      tenantId: tenantB.id,
      organizationId: orgB.id,
      code: "CO1",
      name: "Company One",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(companyB1);

    const createCustomer = new CreateCustomerUseCase(customers);
    const updateCustomer = new UpdateCustomerUseCase(customers);
    const listCustomers = new ListCustomersUseCase(customers);
    const createSupplier = new CreateSupplierUseCase(suppliers);

    const customer = await createCustomer.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "CUST-01",
      name: "Acme Corp",
      taxId: "TAX-100",
      email: "billing@acme.test",
    });

    // Real DB-level uniqueness on (tenantId, companyId, taxId) — not just an
    // application-level check — verified by attempting a genuine second insert.
    await expect(
      createCustomer.execute({
        tenantId: tenantA.id,
        companyId: companyA1.id,
        code: "CUST-02",
        name: "Duplicate Tax Id",
        taxId: "TAX-100",
      }),
    ).rejects.toThrow(CustomerTaxIdAlreadyInUseError);

    // The same tax id is allowed in a different company under the same tenant.
    await expect(
      createCustomer.execute({
        tenantId: tenantA.id,
        companyId: companyA2.id,
        code: "CUST-01",
        name: "Acme Corp (Company Two)",
        taxId: "TAX-100",
      }),
    ).resolves.toBeDefined();

    // Update round-trip against real Postgres: omit taxId (kept), clear email via "".
    const updated = await updateCustomer.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      id: customer.id,
      name: "Acme Corporation",
      email: "",
    });
    expect(updated.name).toBe("Acme Corporation");
    expect(updated.taxId).toBe("TAX-100");
    expect(updated.email).toBeNull();

    // Cross-tenant isolation: a real second tenant never sees tenant A's customers.
    expect(await listCustomers.execute(tenantB.id, companyB1.id)).toHaveLength(0);
    await expect(
      updateCustomer.execute({ tenantId: tenantB.id, companyId: companyB1.id, id: customer.id, name: "Hijacked" }),
    ).rejects.toThrow(CustomerNotFoundError);

    // Suppliers are a genuinely separate table with the same real constraint.
    await createSupplier.execute({
      tenantId: tenantA.id,
      companyId: companyA1.id,
      code: "SUPP-01",
      name: "Textiles del Norte",
      taxId: "TAX-200",
    });
    await expect(
      createSupplier.execute({
        tenantId: tenantA.id,
        companyId: companyA1.id,
        code: "SUPP-02",
        name: "Duplicate Tax Id",
        taxId: "TAX-200",
      }),
    ).rejects.toThrow(SupplierTaxIdAlreadyInUseError);

    // A customer's tax id and a supplier's tax id never collide — separate tables.
    await expect(
      createSupplier.execute({
        tenantId: tenantA.id,
        companyId: companyA1.id,
        code: "SUPP-03",
        name: "Shares Customer Tax Id",
        taxId: "TAX-100",
      }),
    ).resolves.toBeDefined();
  });
});
