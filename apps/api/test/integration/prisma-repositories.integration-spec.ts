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
import { SeedOwnerRoleUseCase, OWNER_ROLE_NAME } from "../../src/core/access-control/application/use-cases/seed-owner-role.use-case";
import { SyncOwnerRolePermissionsUseCase } from "../../src/core/access-control/application/use-cases/sync-owner-role-permissions.use-case";
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
import { ListPlatformAuditEntriesUseCase } from "../../src/core/audit/application/use-cases/list-platform-audit-entries.use-case";
import { PrismaTenantProvisioningRepository } from "../../src/core/tenants/infrastructure/prisma-tenant-provisioning.repository";
import { ProvisionTenantUseCase } from "../../src/core/tenants/application/provision-tenant.use-case";
import { ListPlatformSettingsUseCase } from "../../src/core/configuration/application/use-cases/list-platform-settings.use-case";
import { InviteMembershipUseCase } from "../../src/core/tenants/application/invite-membership.use-case";
import { AcceptMembershipInvitationUseCase } from "../../src/core/tenants/application/accept-membership-invitation.use-case";
import { RevokeMembershipInvitationUseCase } from "../../src/core/tenants/application/revoke-membership-invitation.use-case";
import { ListMembershipsUseCase } from "../../src/core/tenants/application/list-memberships.use-case";
import { ListPendingInvitationsUseCase } from "../../src/core/tenants/application/list-pending-invitations.use-case";
import {
  InvitationExpiredError,
  InvitedUserNotFoundError,
  MembershipAlreadyExistsError,
  MembershipInvitationNotFoundError,
  MembershipNotFoundForUserError,
  MembershipNotInvitedError,
} from "../../src/core/tenants/application/errors";
import {
  PrismaOutboxMessageRepository,
  DomainEventBus,
  DispatchOutboxBatchUseCase,
  appendOutboxMessage,
  PrismaInboxMessageRepository,
  consumeIdempotently,
  OutboxMessage,
} from "@erp/events";
import { PrismaFileObjectRepository } from "../../src/core/files/infrastructure/prisma-file-object.repository";
import { UploadFileUseCase } from "../../src/core/files/application/use-cases/upload-file.use-case";
import { GetFileDownloadUrlUseCase } from "../../src/core/files/application/use-cases/get-file-download-url.use-case";
import { DeleteFileUseCase } from "../../src/core/files/application/use-cases/delete-file.use-case";
import { PurgeDeletedFilesUseCase } from "../../src/core/files/application/use-cases/purge-deleted-files.use-case";
import { FakeFileStorageAdapter } from "../../src/core/files/test-support/fake-file-storage.adapter";
import { FileObject } from "../../src/core/files/domain/file-object.entity";
import {
  PrismaNotificationRepository,
  PrismaNotificationDeliveryRepository,
  RequestNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from "@erp/notifications";
import { SetUserStatusUseCase } from "../../src/core/users/application/set-user-status.use-case";
import { ListUsersUseCase } from "../../src/core/users/application/list-users.use-case";
import { AppDefinition } from "../../src/core/app-registry/domain/app-definition.entity";
import { PrismaAppDefinitionRepository } from "../../src/core/app-registry/infrastructure/prisma-app-definition.repository";
import { PrismaTenantAppRepository } from "../../src/core/app-registry/infrastructure/prisma-tenant-app.repository";
import { PrismaAppConfigurationRepository } from "../../src/core/app-registry/infrastructure/prisma-app-configuration.repository";
import { EnableAppUseCase } from "../../src/core/app-registry/application/use-cases/enable-app.use-case";
import { DisableAppUseCase } from "../../src/core/app-registry/application/use-cases/disable-app.use-case";
import { ListTenantAppsUseCase } from "../../src/core/app-registry/application/use-cases/list-tenant-apps.use-case";
import { ListAppConfigurationUseCase } from "../../src/core/app-registry/application/use-cases/list-app-configuration.use-case";
import { SetAppConfigurationUseCase } from "../../src/core/app-registry/application/use-cases/set-app-configuration.use-case";
import { EnableAllCatalogAppsUseCase } from "../../src/core/app-registry/application/use-cases/enable-all-catalog-apps.use-case";
import { IsAppEnabledForTenantUseCase } from "../../src/core/app-registry/application/use-cases/is-app-enabled-for-tenant.use-case";
import { FOUNDATION_APPS, validateAppCatalog } from "../../src/core/app-registry/application/app-catalog";
import {
  AppDependencyNotSatisfiedError,
  AppHasActiveDependentsError,
  AppNotEnabledError,
} from "../../src/core/app-registry/application/errors";
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
    isPlatformAdmin: false,
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

  it("syncs a real, already-provisioned tenant's stale Owner role against a grown permission catalog", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const permissions = new PrismaPermissionRepository(prisma);
    const roles = new PrismaRoleRepository(prisma);
    const assignments = new PrismaRoleAssignmentRepository(prisma);
    const now = new Date("2026-08-27T10:00:00.000Z");

    // Reproduces the real bug: a tenant provisioned back when only two
    // permissions existed in the catalog, exactly like the real "Web Space"
    // tenant this was found against.
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.read", description: "Read roles", createdAt: now }),
    );
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.manage", description: "Manage roles", createdAt: now }),
    );

    const ownerUser = createUser(now, "stale-owner@example.com");
    const staleTenant = createTenant(now, "stale-owner-tenant");
    await users.save(ownerUser);
    await tenants.save(staleTenant);
    const ownerMembership = Membership.create({
      id: newId(),
      tenantId: staleTenant.id,
      userId: ownerUser.id,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await memberships.save(ownerMembership);

    const seedOwnerRole = new SeedOwnerRoleUseCase(roles, permissions, assignments);
    await seedOwnerRole.execute(staleTenant.id, ownerMembership.id);
    const hasPermission = new HasPermissionUseCase(assignments, roles);
    await expect(
      hasPermission.execute({
        tenantId: staleTenant.id,
        membershipId: ownerMembership.id,
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(true);

    // Later, more modules ship and add more permissions to the catalog —
    // the already-seeded Owner role above does not automatically gain them.
    await permissions.upsert(
      Permission.create({ id: newId(), key: "catalog.products.read", description: "x", createdAt: now }),
    );
    await permissions.upsert(
      Permission.create({ id: newId(), key: "sales.orders.manage", description: "x", createdAt: now }),
    );
    await expect(
      hasPermission.execute({
        tenantId: staleTenant.id,
        membershipId: ownerMembership.id,
        permissionKey: "catalog.products.read",
      }),
    ).resolves.toBe(false);

    const syncOwnerRolePermissions = new SyncOwnerRolePermissionsUseCase(roles, permissions);
    await syncOwnerRolePermissions.execute();

    await expect(
      hasPermission.execute({
        tenantId: staleTenant.id,
        membershipId: ownerMembership.id,
        permissionKey: "catalog.products.read",
      }),
    ).resolves.toBe(true);
    await expect(
      hasPermission.execute({
        tenantId: staleTenant.id,
        membershipId: ownerMembership.id,
        permissionKey: "sales.orders.manage",
      }),
    ).resolves.toBe(true);
    // The original grant is preserved, not dropped by the resync.
    await expect(
      hasPermission.execute({
        tenantId: staleTenant.id,
        membershipId: ownerMembership.id,
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(true);

    // A tenant's own custom role, even if named exactly "Owner" but never
    // seeded as a system role, must never be touched by the sync.
    const customRole = Role.create({
      id: newId(),
      tenantId: staleTenant.id,
      name: `${OWNER_ROLE_NAME} (custom)`,
      isSystem: false,
      permissionKeys: [],
      createdAt: now,
      updatedAt: now,
    });
    await roles.save(customRole);
    await syncOwnerRolePermissions.execute();
    const reloadedCustomRole = await roles.findByName(staleTenant.id, `${OWNER_ROLE_NAME} (custom)`);
    expect(reloadedCustomRole?.permissionKeys).toEqual([]);
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
    const listPlatformAuditEntries = new ListPlatformAuditEntriesUseCase(auditEntries);
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

    // The platform-scoped view (ListPlatformAuditEntriesUseCase, behind
    // PlatformAdminGuard) sees exactly the entry neither tenant-scoped view
    // can: the null-tenant auth event, and only that one.
    const platformEntries = await listPlatformAuditEntries.execute();
    expect(platformEntries).toHaveLength(1);
    expect(platformEntries[0]).toMatchObject({
      tenantId: null,
      action: "auth.login.succeeded",
      userId: actor.id,
    });

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

  it("uploads, downloads and soft-deletes a file with real tenant/company/owner FKs and cross-tenant isolation", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const organizations = new PrismaOrganizationRepository(prisma);
    const companies = new PrismaCompanyRepository(prisma);
    const files = new PrismaFileObjectRepository(prisma);
    const storage = new FakeFileStorageAdapter();
    const uploadFile = new UploadFileUseCase(files, storage);
    const getDownloadUrl = new GetFileDownloadUrlUseCase(files, storage);
    const deleteFile = new DeleteFileUseCase(files);
    const now = new Date("2026-08-27T22:00:00.000Z");

    const owner = createUser(now, "files-owner@example.com");
    const tenantA = createTenant(now, "files-tenant-a");
    const tenantB = createTenant(now, "files-tenant-b");
    await users.save(owner);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const organization = Organization.create({
      id: newId(),
      tenantId: tenantA.id,
      code: "HQ",
      name: "Files Tenant A HQ",
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
      name: "Files Tenant A Company",
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await companies.save(company);

    const uploaded = await uploadFile.execute({
      tenantId: tenantA.id,
      companyId: company.id,
      ownerUserId: owner.id,
      originalFilename: "invoice.pdf",
      contentType: "application/pdf",
      buffer: Buffer.from("real postgres upload"),
      maxSizeBytes: 1024,
    });
    expect(storage.has(uploaded.storageKey)).toBe(true);

    await expect(files.findById(uploaded.id)).resolves.toMatchObject({
      id: uploaded.id,
      tenantId: tenantA.id,
      companyId: company.id,
      ownerUserId: owner.id,
      status: "ACTIVE",
    });

    // Cross-tenant isolation: the same file must never appear when listing
    // under a different tenant, even though the row exists in the same table.
    await expect(files.findByTenant({ tenantId: tenantB.id, limit: 50 })).resolves.toEqual([]);
    await expect(files.findByTenant({ tenantId: tenantA.id, limit: 50 })).resolves.toMatchObject([
      { id: uploaded.id },
    ]);

    const downloadUrl = await getDownloadUrl.execute({
      fileId: uploaded.id,
      tenantId: tenantA.id,
      ttlSeconds: 300,
    });
    expect(downloadUrl.url).toContain(uploaded.storageKey);

    await expect(
      getDownloadUrl.execute({ fileId: uploaded.id, tenantId: tenantB.id, ttlSeconds: 300 }),
    ).rejects.toThrow("The file was not found.");

    const deleted = await deleteFile.execute({ fileId: uploaded.id, tenantId: tenantA.id });
    expect(deleted.status).toBe("DELETED");
    // Soft-deleted files disappear from the tenant listing (PrismaFileObjectRepository
    // filters to ACTIVE) but the row itself is still retrievable by id.
    await expect(files.findByTenant({ tenantId: tenantA.id, limit: 50 })).resolves.toEqual([]);
    await expect(files.findById(uploaded.id)).resolves.toMatchObject({ status: "DELETED" });

    // A companyId belonging to a different tenant must be structurally
    // impossible via the composite (tenant_id, company_id) FK, not merely
    // application-filtered — same pattern as setting_values/audit_entries.
    const crossTenantFile = FileObject.create({
      id: newId(),
      tenantId: tenantB.id,
      companyId: company.id,
      ownerUserId: owner.id,
      storageKey: `tenants/${tenantB.id}/files/${newId()}`,
      originalFilename: "invalid.pdf",
      contentType: "application/pdf",
      sizeBytes: 10n,
      status: "ACTIVE",
      createdAt: now,
      deletedAt: null,
      purgedAt: null,
    });
    await expect(files.save(crossTenantFile)).rejects.toThrow();
  });

  it("requests, lists, filters unread and marks read a notification with real tenant/recipient FKs and cross-tenant/cross-recipient isolation", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const notifications = new PrismaNotificationRepository(prisma);
    const deliveries = new PrismaNotificationDeliveryRepository(prisma);
    const requestNotification = new RequestNotificationUseCase(notifications, deliveries);
    const listNotifications = new ListNotificationsUseCase(notifications);
    const markRead = new MarkNotificationReadUseCase(notifications, deliveries);
    const now = new Date("2026-08-28T00:00:00.000Z");

    const recipient = createUser(now, "notifications-recipient@example.com");
    const otherUser = createUser(now, "notifications-other-user@example.com");
    const tenantA = createTenant(now, "notifications-tenant-a");
    const tenantB = createTenant(now, "notifications-tenant-b");
    await users.save(recipient);
    await users.save(otherUser);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    const requested = await requestNotification.execute({
      tenantId: tenantA.id,
      recipientUserId: recipient.id,
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista para usarse.",
      data: { tenantId: tenantA.id },
      channels: ["IN_APP", "EMAIL"],
    });
    expect(requested.deliveries).toHaveLength(2);
    expect(requested.deliveries.find((d) => d.channel === "IN_APP")?.status).toBe("SENT");
    expect(requested.deliveries.find((d) => d.channel === "EMAIL")?.status).toBe("FAILED");

    await expect(notifications.findById(requested.notification.id)).resolves.toMatchObject({
      id: requested.notification.id,
      tenantId: tenantA.id,
      recipientUserId: recipient.id,
    });

    // Cross-tenant and cross-recipient isolation: the same notification must
    // never appear when listing under a different tenant or a different
    // recipient, even though the row exists in the same table.
    await expect(
      listNotifications.execute({ tenantId: tenantB.id, recipientUserId: recipient.id }),
    ).resolves.toEqual([]);
    await expect(
      listNotifications.execute({ tenantId: tenantA.id, recipientUserId: otherUser.id }),
    ).resolves.toEqual([]);

    const beforeRead = await listNotifications.execute({
      tenantId: tenantA.id,
      recipientUserId: recipient.id,
      unreadOnly: true,
    });
    expect(beforeRead).toHaveLength(1);
    expect(beforeRead[0]?.delivery?.readAt).toBeNull();

    await expect(
      markRead.execute({
        notificationId: requested.notification.id,
        tenantId: tenantB.id,
        recipientUserId: recipient.id,
      }),
    ).rejects.toThrow("The notification was not found.");

    const marked = await markRead.execute({
      notificationId: requested.notification.id,
      tenantId: tenantA.id,
      recipientUserId: recipient.id,
    });
    expect(marked?.readAt).not.toBeNull();

    // Read filters it out of the unread-only view but it still shows up in the full listing.
    await expect(
      listNotifications.execute({ tenantId: tenantA.id, recipientUserId: recipient.id, unreadOnly: true }),
    ).resolves.toEqual([]);
    const afterRead = await listNotifications.execute({ tenantId: tenantA.id, recipientUserId: recipient.id });
    expect(afterRead).toHaveLength(1);
    expect(afterRead[0]?.delivery?.readAt).not.toBeNull();
  });

  it("invites, lists and accepts a membership with real FK-backed identity, and rejects cross-user acceptance", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const inviteMembership = new InviteMembershipUseCase(memberships, users);
    const listMemberships = new ListMembershipsUseCase(memberships, users);
    const acceptInvitation = new AcceptMembershipInvitationUseCase(tenants, memberships);
    const now = new Date("2026-08-28T10:00:00.000Z");

    const owner = createUser(now, "membership-owner@example.com");
    const invitee = createUser(now, "membership-invitee@example.com");
    const stranger = createUser(now, "membership-stranger@example.com");
    await users.save(owner);
    await users.save(invitee);
    await users.save(stranger);
    const tenantA = createTenant(now, "membership-tenant-a");
    const tenantB = createTenant(now, "membership-tenant-b");
    await tenants.save(tenantA);
    await tenants.save(tenantB);
    await memberships.save(
      Membership.create({
        id: newId(),
        tenantId: tenantA.id,
        userId: owner.id,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
    );

    const invitationTtlSeconds = 7 * 24 * 60 * 60;
    const invited = await inviteMembership.execute({
      tenantId: tenantA.id,
      email: invitee.email,
      invitationTtlSeconds,
    });
    expect(invited.membership.status).toBe("INVITED");

    // Real FK: inviting an email with no matching user is a genuine 404, not
    // a deferred/passwordless account creation (MASTER_SPEC §90).
    await expect(
      inviteMembership.execute({ tenantId: tenantA.id, email: "no-such-user@example.com", invitationTtlSeconds }),
    ).rejects.toThrow(InvitedUserNotFoundError);

    // Duplicate invitation to the same user in the same tenant is rejected.
    await expect(
      inviteMembership.execute({ tenantId: tenantA.id, email: invitee.email, invitationTtlSeconds }),
    ).rejects.toThrow(MembershipAlreadyExistsError);

    // Tenant-scoped listing: tenant B never sees tenant A's memberships,
    // even though both rows share the same physical table.
    await expect(listMemberships.execute(tenantB.id)).resolves.toEqual([]);
    const listedForA = await listMemberships.execute(tenantA.id);
    expect(listedForA).toHaveLength(2);
    expect(listedForA.map((m) => m.user.email).sort()).toEqual([invitee.email, owner.email].sort());

    // IDOR-resistant: a different real user (not the invitee) cannot accept
    // the invitation, even with the correct tenant slug and membership id.
    await expect(
      acceptInvitation.execute({
        tenantSlug: tenantA.slug,
        membershipId: invited.membership.id,
        userId: stranger.id,
        invitationTtlSeconds,
      }),
    ).rejects.toThrow(MembershipNotFoundForUserError);

    const accepted = await acceptInvitation.execute({
      tenantSlug: tenantA.slug,
      membershipId: invited.membership.id,
      userId: invitee.id,
      invitationTtlSeconds,
    });
    expect(accepted.status).toBe("ACTIVE");
    await expect(memberships.findById(tenantA.id, invited.membership.id)).resolves.toMatchObject({
      status: "ACTIVE",
    });
  });

  it("revokes a pending invitation, rejects revoking anything else, and lets a fresh invite reopen it", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const inviteMembership = new InviteMembershipUseCase(memberships, users);
    const revokeInvitation = new RevokeMembershipInvitationUseCase(memberships);
    const acceptInvitation = new AcceptMembershipInvitationUseCase(tenants, memberships);
    const now = new Date("2026-08-29T10:00:00.000Z");
    const invitationTtlSeconds = 7 * 24 * 60 * 60;

    const invitee = createUser(now, "revoke-invitee@example.com");
    await users.save(invitee);
    const tenant = createTenant(now, "revoke-tenant");
    await tenants.save(tenant);

    const invited = await inviteMembership.execute({ tenantId: tenant.id, email: invitee.email, invitationTtlSeconds });
    const revoked = await revokeInvitation.execute({ tenantId: tenant.id, membershipId: invited.membership.id });
    expect(revoked.status).toBe("REVOKED");

    // A revoked invitation can no longer be accepted...
    await expect(
      acceptInvitation.execute({
        tenantSlug: tenant.slug,
        membershipId: invited.membership.id,
        userId: invitee.id,
        invitationTtlSeconds,
      }),
    ).rejects.toThrow();

    // ...revoking it again is rejected (not INVITED anymore)...
    await expect(
      revokeInvitation.execute({ tenantId: tenant.id, membershipId: invited.membership.id }),
    ).rejects.toThrow(MembershipNotInvitedError);

    // ...revoking an unknown id in this tenant is a real 404...
    await expect(
      revokeInvitation.execute({ tenantId: tenant.id, membershipId: newId() }),
    ).rejects.toThrow(MembershipInvitationNotFoundError);

    // ...but a fresh invite reopens the exact same row rather than staying blocked forever.
    const reinvited = await inviteMembership.execute({ tenantId: tenant.id, email: invitee.email, invitationTtlSeconds });
    expect(reinvited.membership.id).toBe(invited.membership.id);
    expect(reinvited.membership.status).toBe("INVITED");

    const accepted = await acceptInvitation.execute({
      tenantSlug: tenant.slug,
      membershipId: reinvited.membership.id,
      userId: invitee.id,
      invitationTtlSeconds,
    });
    expect(accepted.status).toBe("ACTIVE");
  });

  it("rejects accepting and hides from the pending list an invitation past its real TTL", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const memberships = new PrismaMembershipRepository(prisma);
    const acceptInvitation = new AcceptMembershipInvitationUseCase(tenants, memberships);
    const listPendingInvitations = new ListPendingInvitationsUseCase(memberships, tenants);
    const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const invitationTtlSeconds = 7 * 24 * 60 * 60;

    const invitee = createUser(past, "expired-invitee@example.com");
    await users.save(invitee);
    const tenant = createTenant(past, "expired-tenant");
    await tenants.save(tenant);
    const staleMembership = Membership.create({
      id: newId(),
      tenantId: tenant.id,
      userId: invitee.id,
      status: "INVITED",
      createdAt: past,
      updatedAt: past,
    });
    await memberships.save(staleMembership);

    await expect(listPendingInvitations.execute(invitee.id, invitationTtlSeconds)).resolves.toEqual([]);
    await expect(
      acceptInvitation.execute({
        tenantSlug: tenant.slug,
        membershipId: staleMembership.id,
        userId: invitee.id,
        invitationTtlSeconds,
      }),
    ).rejects.toThrow(InvitationExpiredError);
  });

  it("purges a real DELETED file's storage object past its retention window, leaving a fresh one untouched", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const files = new PrismaFileObjectRepository(prisma);
    const storage = new FakeFileStorageAdapter();
    const purgeDeletedFiles = new PurgeDeletedFilesUseCase(files, storage);
    const now = new Date("2026-09-01T00:00:00.000Z");

    const owner = createUser(now, "purge-owner@example.com");
    await users.save(owner);
    const tenant = createTenant(now, "purge-tenant");
    await tenants.save(tenant);

    const stale = FileObject.create({
      id: newId(),
      tenantId: tenant.id,
      companyId: null,
      ownerUserId: owner.id,
      storageKey: `tenants/${tenant.id}/files/stale.pdf`,
      originalFilename: "stale.pdf",
      contentType: "application/pdf",
      sizeBytes: 10n,
      status: "DELETED",
      createdAt: now,
      deletedAt: new Date("2026-07-01T00:00:00.000Z"),
      purgedAt: null,
    });
    const fresh = FileObject.create({
      id: newId(),
      tenantId: tenant.id,
      companyId: null,
      ownerUserId: owner.id,
      storageKey: `tenants/${tenant.id}/files/fresh.pdf`,
      originalFilename: "fresh.pdf",
      contentType: "application/pdf",
      sizeBytes: 10n,
      status: "DELETED",
      createdAt: now,
      deletedAt: new Date("2026-08-28T00:00:00.000Z"),
      purgedAt: null,
    });
    await storage.putObject({ key: stale.storageKey, body: Buffer.from("x"), contentType: "application/pdf" });
    await storage.putObject({ key: fresh.storageKey, body: Buffer.from("x"), contentType: "application/pdf" });
    await files.save(stale);
    await files.save(fresh);

    const result = await purgeDeletedFiles.execute({ retentionDays: 30, batchSize: 100, now });

    expect(result).toEqual({ purged: 1, failed: 0 });
    expect(storage.has(stale.storageKey)).toBe(false);
    expect(storage.has(fresh.storageKey)).toBe(true);
    await expect(files.findById(stale.id)).resolves.toMatchObject({ status: "PURGED" });
    await expect(files.findById(fresh.id)).resolves.toMatchObject({ status: "DELETED" });
  });

  it("persists isPlatformAdmin, lists users across the platform, and lets an admin change another user's status", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const auditEntries = new PrismaAuditEntryRepository(prisma);
    const recordAuditEntry = new RecordAuditEntryUseCase(auditEntries);
    const listUsers = new ListUsersUseCase(users);
    const setUserStatus = new SetUserStatusUseCase(users, recordAuditEntry);
    const now = new Date("2026-08-28T18:00:00.000Z");

    const admin = createUser(now, "platform-admin@example.com");
    const target = createUser(now, "platform-target@example.com");
    await users.save(admin);
    await users.save(target);

    // isPlatformAdmin defaults to false via User.create/CreateUserUseCase;
    // granting it is a direct DB write in production (ADR-007) — simulated
    // here the same way, via Prisma directly, not through any use case.
    await prisma.user.update({ where: { id: admin.id }, data: { isPlatformAdmin: true } });

    const reloadedAdmin = await users.findById(admin.id);
    expect(reloadedAdmin?.isPlatformAdmin).toBe(true);

    const allUsers = await listUsers.execute();
    const listedTarget = allUsers.find((u) => u.id === target.id);
    expect(listedTarget?.isPlatformAdmin).toBe(false);

    const updated = await setUserStatus.execute({
      userId: target.id,
      status: "DISABLED",
      actorUserId: admin.id,
      correlationId: "integration-platform-admin-1",
    });
    expect(updated.status).toBe("DISABLED");
    await expect(users.findById(target.id)).resolves.toMatchObject({ status: "DISABLED" });
  });

  it("writes a real PLATFORM-scoped setting value and resolves it as the effective value for a tenant with no override", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const definitions = new PrismaSettingDefinitionRepository(prisma);
    const values = new PrismaSettingValueRepository(prisma);
    const setSettingValue = new SetSettingValueUseCase(definitions, values);
    const getEffectiveSetting = new GetEffectiveSettingUseCase(definitions, values);
    const listPlatformSettings = new ListPlatformSettingsUseCase(definitions, getEffectiveSetting);
    const now = new Date("2026-08-28T19:00:00.000Z");

    const tenantA = createTenant(now, "platform-settings-tenant-a");
    await tenants.save(tenantA);

    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.currency.platform-integration-test",
        dataType: "STRING",
        description: "Integration test currency setting for PLATFORM writes",
        defaultValue: "USD",
        allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
        createdAt: now,
      }),
    );

    // Before any PLATFORM override, both the platform-wide list and a
    // tenant's own effective resolution fall back to the definition default.
    const beforeList = await listPlatformSettings.execute();
    expect(
      beforeList.find((s) => s.key === "localization.currency.platform-integration-test"),
    ).toMatchObject({ value: "USD", source: "DEFAULT" });
    await expect(
      getEffectiveSetting.execute({
        key: "localization.currency.platform-integration-test",
        tenantId: tenantA.id,
      }),
    ).resolves.toMatchObject({ value: "USD", source: "DEFAULT" });

    await setSettingValue.execute({
      key: "localization.currency.platform-integration-test",
      scopeType: "PLATFORM",
      tenantId: null,
      companyId: null,
      value: "EUR",
    });

    const afterList = await listPlatformSettings.execute();
    expect(
      afterList.find((s) => s.key === "localization.currency.platform-integration-test"),
    ).toMatchObject({ value: "EUR", source: "PLATFORM" });
    // A tenant with no TENANT/COMPANY override of its own now falls back to
    // the real PLATFORM row, not the definition's hardcoded default.
    await expect(
      getEffectiveSetting.execute({
        key: "localization.currency.platform-integration-test",
        tenantId: tenantA.id,
      }),
    ).resolves.toMatchObject({ value: "EUR", source: "PLATFORM" });
  });

  it("claims each (consumerName, messageId) pair exactly once under real concurrent claimants", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const inbox = new PrismaInboxMessageRepository(prisma as unknown as PrismaClient);
    const now = new Date();

    const [claimA, claimB] = await Promise.all([
      inbox.tryClaim({
        consumerName: "integration-inbox-consumer",
        messageId: newId(),
        tenantId: null,
        now,
        leaseSeconds: 300,
      }),
      inbox.tryClaim({
        consumerName: "integration-inbox-consumer",
        messageId: newId(),
        tenantId: null,
        now,
        leaseSeconds: 300,
      }),
    ]);
    // Different message ids: both are genuinely new, both must succeed.
    expect([claimA, claimB]).toEqual([true, true]);

    const sharedMessageId = newId();
    const [sharedA, sharedB] = await Promise.all([
      inbox.tryClaim({
        consumerName: "integration-inbox-consumer",
        messageId: sharedMessageId,
        tenantId: null,
        now,
        leaseSeconds: 300,
      }),
      inbox.tryClaim({
        consumerName: "integration-inbox-consumer",
        messageId: sharedMessageId,
        tenantId: null,
        now,
        leaseSeconds: 300,
      }),
    ]);
    // Same message id claimed concurrently: exactly one caller must win.
    expect([sharedA, sharedB].filter(Boolean)).toHaveLength(1);
  });

  it("recovers an inbox message whose PROCESSING lease expired, without a separate worker crashing", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const inbox = new PrismaInboxMessageRepository(prisma as unknown as PrismaClient);
    const messageId = newId();
    const staleClaimTime = new Date(Date.now() - 120_000);

    await inbox.tryClaim({
      consumerName: "integration-inbox-consumer",
      messageId,
      tenantId: null,
      now: staleClaimTime,
      leaseSeconds: 300,
    });

    const tooSoon = await inbox.tryClaim({
      consumerName: "integration-inbox-consumer",
      messageId,
      tenantId: null,
      now: new Date(),
      leaseSeconds: 300, // lease still valid at this length
    });
    expect(tooSoon).toBe(false);

    const recovered = await inbox.tryClaim({
      consumerName: "integration-inbox-consumer",
      messageId,
      tenantId: null,
      now: new Date(),
      leaseSeconds: 60, // shorter than the 120s-old lock — now claimable
    });
    expect(recovered).toBe(true);
  });

  it("delivers tenancy.tenant.provisioned.v1 end-to-end through the real outbox and produces exactly one consumer effect despite a redelivery", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const provisioning = new PrismaTenantProvisioningRepository(prisma);
    const provisionTenant = new ProvisionTenantUseCase(tenants, provisioning, users);
    const outbox = new PrismaOutboxMessageRepository(prisma as unknown as PrismaClient);
    const inbox = new PrismaInboxMessageRepository(prisma as unknown as PrismaClient);
    const bus = new DomainEventBus();
    const dispatch = new DispatchOutboxBatchUseCase(outbox, bus);
    const now = new Date("2026-08-29T21:00:00.000Z");

    const owner = createUser(now, "inbox-owner@example.com");
    await users.save(owner);

    const consumerEffect = jest.fn().mockResolvedValue(undefined);
    bus.subscribe("tenancy.tenant.provisioned.v1", async (event) => {
      await consumeIdempotently(
        inbox,
        { consumerName: "integration-notifications", messageId: event.eventId, tenantId: event.tenantId, now: new Date() },
        () => consumerEffect(event.eventId),
      );
    });

    await provisionTenant.execute({
      slug: "inbox-tenant",
      name: "Inbox Tenant",
      ownerUserId: owner.id,
      organization: { code: "HQ", name: "HQ Org" },
      correlationId: "integration-inbox-correlation-1",
    });

    const dispatchResult = await dispatch.execute({ workerId: "integration-inbox-worker" });
    expect(dispatchResult).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(consumerEffect).toHaveBeenCalledTimes(1);

    // Simulate a redelivery of the exact same event (the outbox's own
    // at-least-once guarantee, e.g. a retry after a transport hiccup) — the
    // consumer must not produce a second effect.
    const publishedRow = await prisma.outboxMessage.findFirstOrThrow({
      where: { eventType: "tenancy.tenant.provisioned.v1", correlationId: "integration-inbox-correlation-1" },
    });
    await bus.publish(
      OutboxMessage.create({
        id: publishedRow.id,
        tenantId: publishedRow.tenantId,
        companyId: publishedRow.companyId,
        eventType: publishedRow.eventType,
        eventVersion: publishedRow.eventVersion,
        aggregateType: publishedRow.aggregateType,
        aggregateId: publishedRow.aggregateId,
        aggregateVersion: publishedRow.aggregateVersion,
        payload: publishedRow.payload,
        occurredAt: publishedRow.occurredAt,
        availableAt: publishedRow.availableAt,
        status: publishedRow.status,
        attemptCount: publishedRow.attemptCount,
        lastErrorCode: publishedRow.lastErrorCode,
        lockedAt: publishedRow.lockedAt,
        lockedBy: publishedRow.lockedBy,
        publishedAt: publishedRow.publishedAt,
        correlationId: publishedRow.correlationId,
        causationId: publishedRow.causationId,
        actorType: publishedRow.actorType as "USER" | "SYSTEM" | null,
        actorId: publishedRow.actorId,
        createdAt: publishedRow.createdAt,
      }).toEnvelope(),
    );

    expect(consumerEffect).toHaveBeenCalledTimes(1);
  });

  it("requests exactly one real tenant-owner notification from a real tenancy.tenant.provisioned.v1 delivery, even redelivered", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const provisioning = new PrismaTenantProvisioningRepository(prisma);
    const provisionTenant = new ProvisionTenantUseCase(tenants, provisioning, users);
    const outbox = new PrismaOutboxMessageRepository(prisma as unknown as PrismaClient);
    const inbox = new PrismaInboxMessageRepository(prisma as unknown as PrismaClient);
    const bus = new DomainEventBus();
    const dispatch = new DispatchOutboxBatchUseCase(outbox, bus);
    const notifications = new PrismaNotificationRepository(prisma);
    const deliveries = new PrismaNotificationDeliveryRepository(prisma);
    const requestNotification = new RequestNotificationUseCase(notifications, deliveries);
    const listNotifications = new ListNotificationsUseCase(notifications);
    const now = new Date("2026-08-29T22:00:00.000Z");

    // Mirrors apps/worker's TenantProvisionedNotificationHandler line for
    // line (that class itself is unit-tested in isolation with a mocked
    // RequestNotificationUseCase) — this proves the real Prisma repos, the
    // real use case and the real inbox mechanism actually integrate against
    // Postgres, which is what an integration test is for.
    const owner = createUser(now, "worker-notification-owner@example.com");
    await users.save(owner);

    bus.subscribe("tenancy.tenant.provisioned.v1", async (event) => {
      const payload = event.payload as { tenantId: string; slug: string; name: string; ownerUserId: string };
      await consumeIdempotently(
        inbox,
        { consumerName: "notifications.tenant-provisioned", messageId: event.eventId, tenantId: event.tenantId, now: new Date() },
        async () => {
          await requestNotification.execute({
            tenantId: payload.tenantId,
            recipientUserId: payload.ownerUserId,
            type: "tenancy.tenant_provisioned",
            title: "Tu empresa fue creada",
            body: `${payload.name} está lista para usarse.`,
            data: { tenantId: payload.tenantId, tenantSlug: payload.slug },
            channels: ["IN_APP"],
          });
        },
      );
    });

    const provisioned = await provisionTenant.execute({
      slug: "worker-notification-tenant",
      name: "Worker Notification Tenant",
      ownerUserId: owner.id,
      organization: { code: "HQ", name: "HQ Org" },
      correlationId: "worker-notification-correlation-1",
    });

    await dispatch.execute({ workerId: "worker-notification-integration" });

    const afterFirstDelivery = await listNotifications.execute({
      tenantId: provisioned.tenant.id,
      recipientUserId: owner.id,
    });
    expect(afterFirstDelivery).toHaveLength(1);
    expect(afterFirstDelivery[0]?.notification.type).toBe("tenancy.tenant_provisioned");
    expect(afterFirstDelivery[0]?.delivery?.status).toBe("SENT");

    // Redeliver the exact same event manually — no second notification.
    const publishedRow = await prisma.outboxMessage.findFirstOrThrow({
      where: { eventType: "tenancy.tenant.provisioned.v1", correlationId: "worker-notification-correlation-1" },
    });
    await bus.publish(
      OutboxMessage.create({
        id: publishedRow.id,
        tenantId: publishedRow.tenantId,
        companyId: publishedRow.companyId,
        eventType: publishedRow.eventType,
        eventVersion: publishedRow.eventVersion,
        aggregateType: publishedRow.aggregateType,
        aggregateId: publishedRow.aggregateId,
        aggregateVersion: publishedRow.aggregateVersion,
        payload: publishedRow.payload,
        occurredAt: publishedRow.occurredAt,
        availableAt: publishedRow.availableAt,
        status: publishedRow.status,
        attemptCount: publishedRow.attemptCount,
        lastErrorCode: publishedRow.lastErrorCode,
        lockedAt: publishedRow.lockedAt,
        lockedBy: publishedRow.lockedBy,
        publishedAt: publishedRow.publishedAt,
        correlationId: publishedRow.correlationId,
        causationId: publishedRow.causationId,
        actorType: publishedRow.actorType as "USER" | "SYSTEM" | null,
        actorId: publishedRow.actorId,
        createdAt: publishedRow.createdAt,
      }).toEnvelope(),
    );

    const afterRedelivery = await listNotifications.execute({
      tenantId: provisioned.tenant.id,
      recipientUserId: owner.id,
    });
    expect(afterRedelivery).toHaveLength(1);
  });

  it("enforces App Registry dependencies, dependents and tenant isolation against real Postgres", async () => {
    const prisma = asRepositoryClient(harness.prisma);
    const users = new PrismaUserRepository(prisma);
    const tenants = new PrismaTenantRepository(prisma);
    const definitions = new PrismaAppDefinitionRepository(prisma);
    const tenantApps = new PrismaTenantAppRepository(prisma);
    const configurations = new PrismaAppConfigurationRepository(prisma);
    const now = new Date("2026-08-30T00:00:00.000Z");

    const owner = createUser(now, "app-registry-owner@example.com");
    const tenantA = createTenant(now, "app-registry-tenant-a");
    const tenantB = createTenant(now, "app-registry-tenant-b");
    await users.save(owner);
    await tenants.save(tenantA);
    await tenants.save(tenantB);

    // Test-only fixture apps, inserted directly like every other sanctioned
    // hard-to-reach-via-API test state in this suite — FOUNDATION_APPS
    // stays empty in production (docs/WORK_QUEUE.md).
    await definitions.upsert(
      AppDefinition.create({
        id: newId(),
        key: "products",
        name: "Products",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: [],
        createdAt: now,
        updatedAt: now,
      }),
    );
    await definitions.upsert(
      AppDefinition.create({
        id: newId(),
        key: "manufacturing",
        name: "Manufacturing",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: ["products"],
        createdAt: now,
        updatedAt: now,
      }),
    );
    // Upsert is idempotent by key — re-seeding must not duplicate the row.
    await definitions.upsert(
      AppDefinition.create({
        id: newId(),
        key: "products",
        name: "Products",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: [],
        createdAt: now,
        updatedAt: now,
      }),
    );
    expect(await definitions.findAll()).toHaveLength(2);

    const enableApp = new EnableAppUseCase(definitions, tenantApps);
    const disableApp = new DisableAppUseCase(definitions, tenantApps);
    const listTenantApps = new ListTenantAppsUseCase(definitions, tenantApps);
    const setConfiguration = new SetAppConfigurationUseCase(definitions, tenantApps, configurations);
    const listConfiguration = new ListAppConfigurationUseCase(definitions, tenantApps, configurations);

    // tenantB tries to enable manufacturing before products — real dependency check.
    await expect(enableApp.execute({ tenantId: tenantB.id, key: "manufacturing" })).rejects.toThrow(
      AppDependencyNotSatisfiedError,
    );

    await enableApp.execute({ tenantId: tenantB.id, key: "products" });
    await enableApp.execute({ tenantId: tenantB.id, key: "manufacturing" });

    // tenantA never enabled anything — real cross-tenant isolation, not a fake.
    const tenantASummaries = await listTenantApps.execute(tenantA.id);
    expect(tenantASummaries).toEqual([
      expect.objectContaining({ key: "manufacturing", status: "DISABLED" }),
      expect.objectContaining({ key: "products", status: "DISABLED" }),
    ]);
    const tenantBSummaries = await listTenantApps.execute(tenantB.id);
    expect(tenantBSummaries).toEqual([
      expect.objectContaining({ key: "manufacturing", status: "ENABLED" }),
      expect.objectContaining({ key: "products", status: "ENABLED" }),
    ]);

    // Real dependents check: disabling products while manufacturing is enabled is rejected.
    await expect(disableApp.execute({ tenantId: tenantB.id, key: "products" })).rejects.toThrow(
      AppHasActiveDependentsError,
    );

    await disableApp.execute({ tenantId: tenantB.id, key: "manufacturing" });
    await disableApp.execute({ tenantId: tenantB.id, key: "products" });
    const afterDisable = await listTenantApps.execute(tenantB.id);
    expect(afterDisable).toEqual([
      expect.objectContaining({ key: "manufacturing", status: "DISABLED" }),
      expect.objectContaining({ key: "products", status: "DISABLED" }),
    ]);

    // Configuration requires the app to be enabled, is tenant-isolated, and upserts by key.
    await enableApp.execute({ tenantId: tenantA.id, key: "products" });
    await setConfiguration.execute({
      tenantId: tenantA.id,
      key: "products",
      configKey: "default_warehouse",
      value: "wh-a",
    });
    await setConfiguration.execute({
      tenantId: tenantA.id,
      key: "products",
      configKey: "default_warehouse",
      value: "wh-a-updated",
    });
    const tenantAConfig = await listConfiguration.execute({ tenantId: tenantA.id, key: "products" });
    expect(tenantAConfig).toEqual([
      expect.objectContaining({ key: "default_warehouse", value: "wh-a-updated" }),
    ]);

    await expect(
      listConfiguration.execute({ tenantId: tenantB.id, key: "products" }),
    ).rejects.toThrow(AppNotEnabledError);
  });

  it(
    "enables the real FOUNDATION_APPS catalog for a tenant end-to-end, and backfills a " +
      "partially-enabled tenant (docs/DECISIONS.md ADR-015)",
    async () => {
      const prisma = asRepositoryClient(harness.prisma);
      const users = new PrismaUserRepository(prisma);
      const tenants = new PrismaTenantRepository(prisma);
      const definitions = new PrismaAppDefinitionRepository(prisma);
      const tenantApps = new PrismaTenantAppRepository(prisma);
      const now = new Date("2026-09-03T00:00:00.000Z");

      const owner = createUser(now, "app-catalog-owner@example.com");
      const tenantC = createTenant(now, "app-registry-tenant-c");
      const tenantD = createTenant(now, "app-registry-tenant-d");
      await users.save(owner);
      await tenants.save(tenantC);
      await tenants.save(tenantD);

      // The real, production catalog — validated the same way AppCatalogSeeder
      // validates it at boot, then seeded the same way (upsert by key).
      validateAppCatalog(FOUNDATION_APPS);
      for (const manifest of FOUNDATION_APPS) {
        await definitions.upsert(
          AppDefinition.create({
            id: newId(),
            key: manifest.key,
            name: manifest.name,
            version: manifest.version,
            kind: manifest.kind,
            dependsOnKeys: manifest.dependsOnKeys,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }

      const enableApp = new EnableAppUseCase(definitions, tenantApps);
      const enableAllCatalogApps = new EnableAllCatalogAppsUseCase(definitions, tenantApps, enableApp);
      const isAppEnabled = new IsAppEnabledForTenantUseCase(definitions, tenantApps);
      const listTenantApps = new ListTenantAppsUseCase(definitions, tenantApps);

      // A brand-new tenant: every one of the 15 real apps enables in one pass,
      // in dependency order, against real Postgres.
      const enabledKeys = await enableAllCatalogApps.execute(tenantC.id);
      expect(enabledKeys.sort()).toEqual(FOUNDATION_APPS.map((manifest) => manifest.key).sort());
      const tenantCSummaries = await listTenantApps.execute(tenantC.id);
      expect(tenantCSummaries.every((summary) => summary.status === "ENABLED")).toBe(true);
      expect(await isAppEnabled.execute({ tenantId: tenantC.id, key: "manufacturing" })).toBe(true);

      // A tenant that only ever enabled a handful of apps by hand (simulating
      // an already-provisioned tenant from before ADR-015) gets backfilled
      // with exactly the apps it was missing — never touching what it already had.
      await enableApp.execute({ tenantId: tenantD.id, key: "catalog" });
      await enableApp.execute({ tenantId: tenantD.id, key: "warehouses" });
      const backfilledKeys = await enableAllCatalogApps.execute(tenantD.id);
      expect(backfilledKeys).not.toContain("catalog");
      expect(backfilledKeys).not.toContain("warehouses");
      expect(backfilledKeys).toContain("manufacturing");
      const tenantDSummaries = await listTenantApps.execute(tenantD.id);
      expect(tenantDSummaries.every((summary) => summary.status === "ENABLED")).toBe(true);

      // Cross-tenant isolation: disabling one app for tenantC never touches tenantD.
      const disableApp = new DisableAppUseCase(definitions, tenantApps);
      await disableApp.execute({ tenantId: tenantC.id, key: "manufacturing" });
      expect(await isAppEnabled.execute({ tenantId: tenantC.id, key: "manufacturing" })).toBe(false);
      expect(await isAppEnabled.execute({ tenantId: tenantD.id, key: "manufacturing" })).toBe(true);
    },
  );
});
