import { Module } from "@nestjs/common";
import { PERMISSION_REPOSITORY } from "./domain/permission.repository";
import { ROLE_REPOSITORY } from "./domain/role.repository";
import { ROLE_ASSIGNMENT_REPOSITORY } from "./domain/role-assignment.repository";
import { PrismaPermissionRepository } from "./infrastructure/prisma-permission.repository";
import { PrismaRoleRepository } from "./infrastructure/prisma-role.repository";
import { PrismaRoleAssignmentRepository } from "./infrastructure/prisma-role-assignment.repository";
import { PermissionCatalogSeeder } from "./application/permission-catalog-seeder";
import { CreateRoleUseCase } from "./application/use-cases/create-role.use-case";
import { AssignRoleUseCase } from "./application/use-cases/assign-role.use-case";
import { ListRolesUseCase } from "./application/use-cases/list-roles.use-case";
import { ListPermissionsUseCase } from "./application/use-cases/list-permissions.use-case";
import { HasPermissionUseCase } from "./application/use-cases/has-permission.use-case";
import { SeedOwnerRoleUseCase } from "./application/use-cases/seed-owner-role.use-case";
import { PermissionGuard } from "./presentation/permission.guard";

/**
 * Deliberately has ZERO dependency on TenantsModule (or any other core
 * module) — this is what keeps it safe for TenantsModule to depend on
 * AccessControlModule (for SeedOwnerRoleUseCase at provisioning, and for
 * RolesController's use cases/PermissionGuard) without a module import
 * cycle. PermissionGuard reads `request.tenantContext` via the ambient
 * Express Request augmentation declared in core/tenants/presentation —
 * that's a type-only association, not a runtime one. RolesController itself
 * is not part of this module at all — it lives in
 * core/tenants/presentation/roles.controller.ts because it also needs
 * SessionAuthGuard/TenantContextGuard/CurrentTenantContext, and importing
 * those here would create a module-loading cycle (tenants -> access-control
 * -> tenants) even though there would be no NestJS DI-level cycle. See that
 * file's docstring for the full reasoning.
 */
@Module({
  providers: [
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: ROLE_ASSIGNMENT_REPOSITORY, useClass: PrismaRoleAssignmentRepository },
    PermissionCatalogSeeder,
    CreateRoleUseCase,
    AssignRoleUseCase,
    ListRolesUseCase,
    ListPermissionsUseCase,
    HasPermissionUseCase,
    SeedOwnerRoleUseCase,
    PermissionGuard,
  ],
  exports: [
    CreateRoleUseCase,
    AssignRoleUseCase,
    ListRolesUseCase,
    ListPermissionsUseCase,
    HasPermissionUseCase,
    SeedOwnerRoleUseCase,
    PermissionGuard,
  ],
})
export class AccessControlModule {}
