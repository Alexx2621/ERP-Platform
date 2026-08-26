import { newId, type PrismaClient } from "@erp/database";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { Credential } from "../../src/core/auth/domain/credential.entity";
import { Session } from "../../src/core/auth/domain/session.entity";
import { PrismaCredentialRepository } from "../../src/core/auth/infrastructure/prisma-credential.repository";
import { PrismaSessionRepository } from "../../src/core/auth/infrastructure/prisma-session.repository";
import { Membership } from "../../src/core/tenants/domain/membership.entity";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaMembershipRepository } from "../../src/core/tenants/infrastructure/prisma-membership.repository";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email = "owner@example.com"): User {
  return User.create({
    id: newId(),
    email,
    displayName: "Integration Owner",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({
    id: newId(),
    slug,
    name: `Tenant ${slug}`,
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

describe("Prisma repositories against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  });

  afterEach(async () => {
    await harness?.reset();
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it("persists and updates the auth aggregate with real constraints", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const credentials = new PrismaCredentialRepository(prisma);
    const sessions = new PrismaSessionRepository(prisma);
    const now = new Date("2026-08-26T12:00:00.000Z");
    const user = createUser(now);

    await users.save(user);
    await expect(users.findByEmail(user.email)).resolves.toMatchObject({
      id: user.id,
      status: "ACTIVE",
    });

    const credential = Credential.create({
      id: newId(),
      userId: user.id,
      passwordHash: "$argon2id$initial",
      createdAt: now,
      updatedAt: now,
    });
    await credentials.save(credential);
    credential.changePasswordHash("$argon2id$rotated");
    await credentials.save(credential);
    await expect(credentials.findByUserId(user.id)).resolves.toMatchObject({
      passwordHash: "$argon2id$rotated",
    });

    const session = Session.create({
      id: newId(),
      userId: user.id,
      accessTokenHash: "a".repeat(64),
      refreshTokenHash: "b".repeat(64),
      status: "ACTIVE",
      accessExpiresAt: new Date("2026-08-26T12:15:00.000Z"),
      refreshExpiresAt: new Date("2026-09-02T12:00:00.000Z"),
      revokedAt: null,
      lastUsedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
      createdAt: now,
    });
    await sessions.save(session);
    await expect(sessions.findByAccessTokenHash(session.accessTokenHash)).resolves.toMatchObject({
      id: session.id,
      status: "ACTIVE",
    });
    await expect(sessions.findActiveByUserId(user.id)).resolves.toHaveLength(1);

    user.disable();
    session.revoke(new Date("2026-08-26T12:05:00.000Z"));
    await users.save(user);
    await sessions.save(session);

    await expect(users.findById(user.id)).resolves.toMatchObject({ status: "DISABLED" });
    await expect(sessions.findActiveByUserId(user.id)).resolves.toEqual([]);
  });

  it("enforces repository scoping and cross-tenant foreign keys", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const now = new Date("2026-08-26T13:00:00.000Z");
    const user = createUser(now, "tenant-owner@example.com");
    const tenantA = createTenant(now, "tenant-a");
    const tenantB = createTenant(now, "tenant-b");

    await users.save(user);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const membership = Membership.create({
      id: newId(),
      tenantId: tenantA.id,
      userId: user.id,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await memberships.save(membership);

    const organization = Organization.create({
      id: newId(),
      tenantId: tenantA.id,
      code: "HQ",
      name: "Tenant A Headquarters",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await organizations.save(organization);

    const company = Company.create({
      id: newId(),
      tenantId: tenantA.id,
      organizationId: organization.id,
      code: "COMPANY",
      name: "Tenant A Company",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(company);

    await expect(memberships.findById(tenantB.id, membership.id)).resolves.toBeNull();
    await expect(organizations.findById(tenantB.id, organization.id)).resolves.toBeNull();
    await expect(companies.findById(tenantB.id, company.id)).resolves.toBeNull();
    await expect(companies.findByCode(tenantA.id, company.code)).resolves.toMatchObject({
      id: company.id,
      tenantId: tenantA.id,
    });

    const crossTenantCompany = Company.create({
      id: newId(),
      tenantId: tenantB.id,
      organizationId: organization.id,
      code: "INVALID",
      name: "Invalid Cross Tenant Company",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await expect(companies.save(crossTenantCompany)).rejects.toThrow();
    await expect(companies.findById(tenantB.id, crossTenantCompany.id)).resolves.toBeNull();
  });
});
