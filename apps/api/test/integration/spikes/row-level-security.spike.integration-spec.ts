import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../../src/core/companies/infrastructure/prisma-company.repository";
import type { PrismaService } from "../../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "../postgres-test-harness";

/**
 * Fase 0 spike (docs/ROADMAP.md §4): "RLS con pool, worker y migrations,
 * aunque la decisión sea postergarlo." ADR-003 deferred adopting Row Level
 * Security as the primary tenant-isolation mechanism, but until now that
 * deferral rested only on documented reasoning, not on an executed spike —
 * this test is that spike. It validates RLS's real behavior against this
 * codebase's actual connection pattern (Prisma + @prisma/adapter-pg, a
 * pooled `pg.Pool` under the hood) on a real, already-migrated table
 * (`companies`), entirely inside a throwaway Testcontainers Postgres
 * instance — nothing here touches the shared schema.prisma or any real
 * migration; RLS is enabled/policed/dropped purely within this one test.
 *
 * Findings, folded into docs/MULTITENANCY.md §8.1 and ADR-003's amendment:
 * RLS is real and safe under this connection pattern — `SET LOCAL` (both
 * for the role and the custom `app.current_tenant_id` GUC) is genuinely
 * transaction-scoped and never leaks a *value* across a reused pooled
 * connection, and Prisma's own query builder is transparently filtered by
 * the policy, not just raw SQL. Two concrete operational costs this spike
 * surfaced, neither obvious from documentation alone: (1) a session GUC
 * used in an RLS predicate can't be bound as a query parameter (`SET` has
 * no placeholder syntax), so any real adoption would need its own careful
 * validation of the tenant id before interpolating it into a `SET LOCAL`
 * statement; (2) once a custom GUC has been `SET LOCAL` at least once on a
 * given backend connection, Postgres reverts it to an **empty string**, not
 * NULL, once that transaction ends — a naive `current_setting(name, true)`
 * policy fails open to a hard cast error (not a silent zero-rows deny) the
 * first time a connection that previously served a tenant-scoped request
 * later serves an unscoped one; the policy needs `NULLIF(..., '')` to fail
 * closed correctly. Both are new, concrete arguments for the "operational
 * complexity" ADR-003 already cited in the abstract.
 */
function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

const RLS_ROLE = "erp_rls_spike_role";

describe("RLS spike (docs/ROADMAP.md §4 Fase 0)", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
    const prisma = harness.prisma;

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RLS_ROLE}') THEN
          CREATE ROLE ${RLS_ROLE} NOLOGIN NOBYPASSRLS;
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`GRANT ${RLS_ROLE} TO CURRENT_USER`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT ON companies TO ${RLS_ROLE}`);
    // Deliberately no FORCE ROW LEVEL SECURITY: the table owner (the same
    // role that ran migrations) must keep bypassing RLS, exactly the
    // "migrations own the whole table" assumption ADR-003 relies on.
    await prisma.$executeRawUnsafe(`ALTER TABLE companies ENABLE ROW LEVEL SECURITY`);
    // NULLIF(..., '') matters, not just missing_ok=true: once a custom GUC
    // has been SET LOCAL at least once on a given backend connection,
    // Postgres reverts it to an EMPTY STRING (not NULL) when that
    // transaction ends — confirmed empirically by this spike, not assumed.
    // A pooled connection that served a tenant-scoped request earlier
    // would otherwise make current_setting(..., true) throw a cast error
    // on a later, unscoped request instead of failing closed.
    await prisma.$executeRawUnsafe(`
      CREATE POLICY spike_tenant_isolation ON companies
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    `);
  });

  afterAll(async () => {
    if (harness) {
      await harness.prisma
        .$executeRawUnsafe(`DROP POLICY IF EXISTS spike_tenant_isolation ON companies`)
        .catch(() => undefined);
      await harness.prisma
        .$executeRawUnsafe(`ALTER TABLE companies DISABLE ROW LEVEL SECURITY`)
        .catch(() => undefined);
      await harness.prisma
        .$executeRawUnsafe(`REVOKE ALL ON companies FROM ${RLS_ROLE}`)
        .catch(() => undefined);
      await harness.prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ${RLS_ROLE}`).catch(() => undefined);
      await harness.stop();
    }
  });

  it("enforces tenant isolation via RLS alone, never leaks session state across pooled transactions, and lets the owner/migration role bypass it", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const now = new Date("2026-09-04T00:00:00.000Z");

    const owner = User.create({
      id: newId(),
      email: "rls-spike-owner@example.com",
      displayName: "RLS Spike Owner",
      status: "ACTIVE",
      isPlatformAdmin: false,
      createdAt: now,
      updatedAt: now,
    });
    await users.save(owner);

    const tenantA = Tenant.create({
      id: newId(),
      slug: "rls-spike-a",
      name: "RLS Spike A",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const tenantB = Tenant.create({
      id: newId(),
      slug: "rls-spike-b",
      name: "RLS Spike B",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
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
    await organizations.save(orgA);
    await organizations.save(orgB);

    const companyA1 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "A1",
      name: "Company A1",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const companyA2 = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: orgA.id,
      code: "A2",
      name: "Company A2",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    const companyB1 = Company.create({
      id: newId(),
      tenantId: tenantB.id,
      organizationId: orgB.id,
      code: "B1",
      name: "Company B1",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(companyA1);
    await companies.save(companyA2);
    await companies.save(companyB1);

    // 1. The owner/migration role never assumes the low-privilege role and
    // sees every tenant's rows — RLS never blocks the process that ran the
    // migrations, exactly what ADR-003 assumes today without RLS at all.
    const asOwner = await harness.prisma.company.findMany({ orderBy: { code: "asc" } });
    expect(asOwner.map((c) => c.code)).toEqual(["A1", "A2", "B1"]);

    // 2. Inside a transaction that assumes the low-privilege role and sets
    // the tenant GUC, Prisma's OWN query builder (not just raw SQL) is
    // transparently filtered by the policy.
    const asTenantA = await harness.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_ROLE}`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantA.id}'`);
      return tx.company.findMany({ orderBy: { code: "asc" } });
    });
    expect(asTenantA.map((c) => c.code)).toEqual(["A1", "A2"]);

    // 3. A transaction for tenant B, run immediately after on the same
    // pooled Prisma client, confirms the policy is genuinely driven by the
    // per-transaction value, not a connection-level default.
    const asTenantB = await harness.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_ROLE}`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantB.id}'`);
      return tx.company.findMany();
    });
    expect(asTenantB.map((c) => c.code)).toEqual(["B1"]);

    // 4. THE critical leakage check: a transaction that assumes the
    // low-privilege role but never sets app.current_tenant_id must see
    // ZERO rows (fail-closed) — never tenant A's or B's rows leaking in
    // from a prior transaction's SET LOCAL on a reused pooled connection.
    // Repeated to exercise more than one connection in the pool.
    for (let i = 0; i < 5; i++) {
      const rows = await harness.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_ROLE}`);
        return tx.company.findMany();
      });
      expect(rows).toHaveLength(0);
    }

    // 5. A plain, unscoped transaction straight after (no SET LOCAL ROLE at
    // all) is back to the owner role and sees everything again — SET LOCAL
    // ROLE itself never leaks into a later transaction either.
    const backToOwner = await harness.prisma.company.findMany();
    expect(backToOwner).toHaveLength(3);
  });
});
