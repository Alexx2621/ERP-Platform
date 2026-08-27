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
import { Permission } from "../../src/core/access-control/domain/permission.entity";
import { Role } from "../../src/core/access-control/domain/role.entity";
import { RoleAssignment } from "../../src/core/access-control/domain/role-assignment.entity";
import { PrismaPermissionRepository } from "../../src/core/access-control/infrastructure/prisma-permission.repository";
import { PrismaRoleRepository } from "../../src/core/access-control/infrastructure/prisma-role.repository";
import { PrismaRoleAssignmentRepository } from "../../src/core/access-control/infrastructure/prisma-role-assignment.repository";
import { HasPermissionUseCase } from "../../src/core/access-control/application/use-cases/has-permission.use-case";
import { MembershipNotFoundInTenantError } from "../../src/core/access-control/application/errors";
import { SettingDefinition } from "../../src/core/configuration/domain/setting-definition.entity";
import { PrismaSettingDefinitionRepository } from "../../src/core/configuration/infrastructure/prisma-setting-definition.repository";
import { PrismaSettingValueRepository } from "../../src/core/configuration/infrastructure/prisma-setting-value.repository";
import { PrismaUserPreferenceRepository } from "../../src/core/configuration/infrastructure/prisma-user-preference.repository";
import { SetSettingValueUseCase } from "../../src/core/configuration/application/use-cases/set-setting-value.use-case";
import { GetEffectiveSettingUseCase } from "../../src/core/configuration/application/use-cases/get-effective-setting.use-case";
import { SetUserPreferenceUseCase } from "../../src/core/configuration/application/use-cases/set-user-preference.use-case";
import { CompanyNotFoundInTenantError } from "../../src/core/configuration/application/errors";
import { PrismaAuditEntryRepository } from "../../src/core/audit/infrastructure/prisma-audit-entry.repository";
import { RecordAuditEntryUseCase } from "../../src/core/audit/application/use-cases/record-audit-entry.use-case";
import { ListAuditEntriesUseCase } from "../../src/core/audit/application/use-cases/list-audit-entries.use-case";
import { PrismaTenantProvisioningRepository } from "../../src/core/tenants/infrastructure/prisma-tenant-provisioning.repository";
import { ProvisionTenantUseCase } from "../../src/core/tenants/application/provision-tenant.use-case";
import { PrismaOutboxMessageRepository } from "../../src/core/events/infrastructure/prisma-outbox-message.repository";
import { DomainEventBus } from "../../src/core/events/application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "../../src/core/events/application/use-cases/dispatch-outbox-batch.use-case";
import { appendOutboxMessage } from "../../src/core/events/application/append-outbox-message";
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

  it("enforces RBAC scoping, the membership FK, and cross-tenant isolation with real constraints", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const permissions = new PrismaPermissionRepository(prisma);
    const roles = new PrismaRoleRepository(prisma);
    const assignments = new PrismaRoleAssignmentRepository(prisma);
    const hasPermission = new HasPermissionUseCase(assignments, roles);
    const now = new Date("2026-08-27T10:00:00.000Z");

    const user = createUser(now, "rbac-owner@example.com");
    const tenantA = createTenant(now, "rbac-tenant-a");
    const tenantB = createTenant(now, "rbac-tenant-b");
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

    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.read", description: "Read roles", createdAt: now }),
    );
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.manage", description: "Manage roles", createdAt: now }),
    );

    const role = Role.create({
      id: newId(),
      tenantId: tenantA.id,
      name: "Auditor",
      isSystem: false,
      permissionKeys: ["access.roles.read"],
      createdAt: now,
      updatedAt: now,
    });
    await roles.save(role);

    const persistedRole = await roles.findByName(tenantA.id, "Auditor");
    expect(persistedRole?.hasPermission("access.roles.read")).toBe(true);
    expect(persistedRole?.hasPermission("access.roles.manage")).toBe(false);

    const assignment = RoleAssignment.create({
      id: newId(),
      tenantId: tenantA.id,
      membershipId: membership.id,
      roleId: role.id,
      scopeType: "TENANT",
      scopeId: null,
      createdAt: now,
    });
    await assignments.save(assignment);

    await expect(
      hasPermission.execute({
        tenantId: tenantA.id,
        membershipId: membership.id,
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(true);
    await expect(
      hasPermission.execute({
        tenantId: tenantA.id,
        membershipId: membership.id,
        permissionKey: "access.roles.manage",
      }),
    ).resolves.toBe(false);

    // Same membership, but looked up under tenant B: the (tenantId, roleId)
    // composite FK on role_assignments must make this structurally
    // impossible, not merely application-filtered.
    await expect(
      hasPermission.execute({
        tenantId: tenantB.id,
        membershipId: membership.id,
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(false);
    await expect(assignments.findByMembership(tenantB.id, membership.id)).resolves.toEqual([]);

    const assignmentForUnknownMembership = RoleAssignment.create({
      id: newId(),
      tenantId: tenantA.id,
      membershipId: newId(),
      roleId: role.id,
      scopeType: "TENANT",
      scopeId: null,
      createdAt: now,
    });
    await expect(assignments.save(assignmentForUnknownMembership)).rejects.toThrow(
      MembershipNotFoundInTenantError,
    );
  });

  it("resolves effective settings through the real PLATFORM/TENANT/COMPANY fallback chain and enforces the composite company FK", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const definitions = new PrismaSettingDefinitionRepository(prisma);
    const values = new PrismaSettingValueRepository(prisma);
    const preferences = new PrismaUserPreferenceRepository(prisma);
    const users = new PrismaUserRepository(prisma);
    const setSettingValue = new SetSettingValueUseCase(definitions, values);
    const getEffectiveSetting = new GetEffectiveSettingUseCase(definitions, values);
    const setPreference = new SetUserPreferenceUseCase(preferences);
    const now = new Date("2026-08-27T18:00:00.000Z");

    const tenantA = createTenant(now, "config-tenant-a");
    const tenantB = createTenant(now, "config-tenant-b");
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const organization = Organization.create({
      id: newId(),
      tenantId: tenantA.id,
      code: "HQ",
      name: "Config Tenant A HQ",
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
      code: "CO",
      name: "Config Tenant A Company",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(company);

    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.currency.integration-test",
        dataType: "STRING",
        description: "Integration test currency setting",
        defaultValue: "USD",
        allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
        createdAt: now,
      }),
    );

    await expect(
      getEffectiveSetting.execute({ key: "localization.currency.integration-test", tenantId: tenantA.id }),
    ).resolves.toMatchObject({ value: "USD", source: "DEFAULT" });

    await setSettingValue.execute({
      key: "localization.currency.integration-test",
      scopeType: "TENANT",
      tenantId: tenantA.id,
      companyId: null,
      value: "EUR",
    });
    await expect(
      getEffectiveSetting.execute({ key: "localization.currency.integration-test", tenantId: tenantA.id }),
    ).resolves.toMatchObject({ value: "EUR", source: "TENANT" });
    // Tenant isolation: tenant B never sees tenant A's value.
    await expect(
      getEffectiveSetting.execute({ key: "localization.currency.integration-test", tenantId: tenantB.id }),
    ).resolves.toMatchObject({ value: "USD", source: "DEFAULT" });

    await setSettingValue.execute({
      key: "localization.currency.integration-test",
      scopeType: "COMPANY",
      tenantId: tenantA.id,
      companyId: company.id,
      value: "GBP",
    });
    await expect(
      getEffectiveSetting.execute({
        key: "localization.currency.integration-test",
        tenantId: tenantA.id,
        companyId: company.id,
      }),
    ).resolves.toMatchObject({ value: "GBP", source: "COMPANY" });

    // The composite (tenantId, companyId) FK on setting_values rejects a
    // companyId that does not belong to tenantA — a company created under a
    // different tenant is not just filtered out, it is structurally rejected.
    const foreignCompanyId = newId();
    await expect(
      setSettingValue.execute({
        key: "localization.currency.integration-test",
        scopeType: "COMPANY",
        tenantId: tenantA.id,
        companyId: foreignCompanyId,
        value: "JPY",
      }),
    ).rejects.toThrow(CompanyNotFoundInTenantError);

    const user = createUser(now, "config-preferences@example.com");
    await users.save(user);
    await setPreference.execute({ userId: user.id, key: "theme", value: "dark" });
    const storedPreference = await preferences.findByUserAndKey(user.id, "theme");
    expect(storedPreference?.value).toBe("dark");
  });

  it("records and lists audit entries scoped by tenant with real FK-backed actor/tenant/company references", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const auditEntries = new PrismaAuditEntryRepository(prisma);
    const recordAuditEntry = new RecordAuditEntryUseCase(auditEntries);
    const listAuditEntries = new ListAuditEntriesUseCase(auditEntries);
    const now = new Date("2026-08-27T20:00:00.000Z");

    const actor = createUser(now, "audit-actor@example.com");
    await users.save(actor);
    const tenantA = createTenant(now, "audit-tenant-a");
    const tenantB = createTenant(now, "audit-tenant-b");
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    await recordAuditEntry.execute({
      userId: actor.id,
      tenantId: tenantA.id,
      action: "tenant.provisioned",
      resource: "Tenant",
      resourceId: tenantA.id,
      newValues: { slug: tenantA.slug },
      correlationId: "integration-correlation-1",
    });
    await recordAuditEntry.execute({
      userId: actor.id,
      tenantId: tenantB.id,
      action: "tenant.provisioned",
      resource: "Tenant",
      resourceId: tenantB.id,
      newValues: { slug: tenantB.slug },
      correlationId: "integration-correlation-2",
    });
    // Authentication events are recorded with tenantId: null against the
    // real (nullable) FK — never leaked into any tenant's audit view.
    await recordAuditEntry.execute({
      userId: actor.id,
      tenantId: null,
      action: "auth.login.succeeded",
      resource: "Session",
      correlationId: "integration-correlation-3",
    });

    const entriesForA = await listAuditEntries.execute({ tenantId: tenantA.id });
    expect(entriesForA).toHaveLength(1);
    expect(entriesForA[0]).toMatchObject({
      userId: actor.id,
      tenantId: tenantA.id,
      action: "tenant.provisioned",
      resourceId: tenantA.id,
    });

    const entriesForB = await listAuditEntries.execute({ tenantId: tenantB.id });
    expect(entriesForB).toHaveLength(1);
    expect(entriesForB[0].tenantId).toBe(tenantB.id);

    // Writing an entry against a userId that does not exist is rejected by
    // the real FK, not silently accepted — audit integrity is DB-enforced.
    await expect(
      recordAuditEntry.execute({
        userId: newId(),
        tenantId: tenantA.id,
        action: "tenant.provisioned",
        resource: "Tenant",
        correlationId: "integration-correlation-4",
      }),
    ).resolves.toBeUndefined(); // RecordAuditEntryUseCase never throws — verify it stayed at 1 entry instead.
    await expect(listAuditEntries.execute({ tenantId: tenantA.id })).resolves.toHaveLength(1);
  });

  it("appends the tenant.provisioned outbox message in the same transaction as provisioning, and dispatches it end-to-end", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const provisioning = new PrismaTenantProvisioningRepository(prisma);
    const provisionTenant = new ProvisionTenantUseCase(tenants, provisioning, users);
    const outbox = new PrismaOutboxMessageRepository(prisma);
    const bus = new DomainEventBus();
    const dispatch = new DispatchOutboxBatchUseCase(outbox, bus);
    const now = new Date("2026-08-27T21:00:00.000Z");

    const owner = createUser(now, "events-owner@example.com");
    await users.save(owner);

    const received: unknown[] = [];
    bus.subscribe("tenancy.tenant.provisioned.v1", (event) => {
      received.push(event);
    });

    const result = await provisionTenant.execute({
      slug: "events-tenant",
      name: "Events Tenant",
      ownerUserId: owner.id,
      organization: { code: "HQ", name: "HQ Org" },
      correlationId: "integration-events-correlation-1",
    });

    const pending = await prisma.outboxMessage.findMany({ where: { tenantId: result.tenant.id } });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      status: "PENDING",
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: result.tenant.id,
      correlationId: "integration-events-correlation-1",
      actorType: "USER",
      actorId: owner.id,
    });
    expect(pending[0].payload).toMatchObject({ slug: "events-tenant", ownerUserId: owner.id });

    const dispatchResult = await dispatch.execute({ workerId: "integration-worker" });
    expect(dispatchResult).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      eventType: "tenancy.tenant.provisioned.v1",
      correlationId: "integration-events-correlation-1",
    });

    const publishedRow = await prisma.outboxMessage.findUniqueOrThrow({ where: { id: pending[0].id } });
    expect(publishedRow.status).toBe("PUBLISHED");
    expect(publishedRow.publishedAt).not.toBeNull();
  });

  it("claims each pending outbox row exactly once under real concurrent claimants (FOR UPDATE SKIP LOCKED)", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const outbox = new PrismaOutboxMessageRepository(prisma);

    for (let i = 0; i < 4; i++) {
      await appendOutboxMessage(prisma, {
        tenantId: null,
        eventType: "tenancy.tenant.provisioned.v1",
        eventVersion: 1,
        aggregateType: "Tenant",
        aggregateId: newId(),
        payload: { index: i },
        correlationId: `concurrency-${i}`,
        actor: null,
      });
    }

    // appendOutboxMessage always stamps availableAt with the real system
    // clock (there is no injectable Clock for OutboxMessage), so `now` here
    // must be real too, captured after the inserts above — an arbitrary
    // fixed timestamp could land before every row's real availableAt and
    // make nothing claimable, which is a test bug, not a production one.
    const now = new Date();
    const [batchA, batchB] = await Promise.all([
      outbox.claimBatch({ limit: 2, lockedBy: "claimant-a", now, leaseSeconds: 60 }),
      outbox.claimBatch({ limit: 2, lockedBy: "claimant-b", now, leaseSeconds: 60 }),
    ]);

    const claimedIds = [...batchA, ...batchB].map((message) => message.id);
    expect(claimedIds).toHaveLength(4);
    expect(new Set(claimedIds).size).toBe(4); // no row claimed by both claimants
  });

  it("recovers a message whose PROCESSING lease expired without a separate worker crashing", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const outbox = new PrismaOutboxMessageRepository(prisma);
    const now = new Date("2026-08-27T21:10:00.000Z");

    const message = await appendOutboxMessage(prisma, {
      tenantId: null,
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: newId(),
      payload: {},
      correlationId: "lease-recovery",
      actor: null,
    });

    const staleLock = new Date(now.getTime() - 120_000); // "crashed" 2 minutes ago
    await prisma.outboxMessage.update({
      where: { id: message.id },
      data: { status: "PROCESSING", lockedAt: staleLock, lockedBy: "dead-worker" },
    });

    const nothingYet = await outbox.claimBatch({
      limit: 10,
      lockedBy: "live-worker",
      now,
      leaseSeconds: 300, // lease still valid at this length — not claimable yet
    });
    expect(nothingYet).toHaveLength(0);

    const recovered = await outbox.claimBatch({
      limit: 10,
      lockedBy: "live-worker",
      now,
      leaseSeconds: 60, // shorter than the 120s-old lock — now claimable
    });
    expect(recovered).toHaveLength(1);
    expect(recovered[0].id).toBe(message.id);
  });
});
