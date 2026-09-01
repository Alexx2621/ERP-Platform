import { Inject, Injectable, Logger } from "@nestjs/common";
import { Role } from "../../domain/role.entity";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";
import { PERMISSION_REPOSITORY, PermissionRepository } from "../../domain/permission.repository";
import { OWNER_ROLE_NAME } from "./seed-owner-role.use-case";

/**
 * Closes the gap `SeedOwnerRoleUseCase` documents explicitly: that use case
 * grants a tenant's Owner role every permission that exists *at
 * provisioning time* only, as a one-time snapshot. Every permission added
 * to the catalog afterward (i.e. by every module shipped since) never
 * reaches an already-provisioned tenant's Owner role on its own — found as
 * a real bug against a real tenant ("Web Space", provisioned during
 * session 5's RBAC work) whose Owner role still had only the 3 permissions
 * that existed back then, out of 46 in the catalog by session 28, so every
 * newer module's screen showed "No tienes permiso para realizar esta
 * acción." Run on every API boot (`OwnerRolePermissionSyncSeeder`) so the
 * gap can never reopen as new modules add new permissions.
 */
@Injectable()
export class SyncOwnerRolePermissionsUseCase {
  private readonly logger = new Logger(SyncOwnerRolePermissionsUseCase.name);

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
  ) {}

  async execute(): Promise<void> {
    const allPermissionKeys = (await this.permissions.findAll()).map((permission) => permission.key);
    const ownerRoles = await this.roles.findSystemRolesByName(OWNER_ROLE_NAME);

    let syncedCount = 0;
    for (const role of ownerRoles) {
      const missingKeys = allPermissionKeys.filter((key) => !role.hasPermission(key));
      if (missingKeys.length === 0) continue;

      const props = role.toProps();
      await this.roles.save(
        Role.create({ ...props, permissionKeys: [...props.permissionKeys, ...missingKeys], updatedAt: new Date() }),
      );
      syncedCount += 1;
    }

    this.logger.log(
      `Owner role permission sync: ${syncedCount} of ${ownerRoles.length} tenant Owner role(s) updated.`,
    );
  }
}
