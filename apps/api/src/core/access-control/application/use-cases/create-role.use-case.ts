import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Role } from "../../domain/role.entity";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";
import { PERMISSION_REPOSITORY, PermissionRepository } from "../../domain/permission.repository";
import { RoleNameAlreadyInUseError, UnknownPermissionKeysError } from "../errors";

export interface CreateRoleInput {
  tenantId: string;
  name: string;
  permissionKeys: string[];
  isSystem?: boolean;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
  ) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    const name = input.name.trim();
    const existing = await this.roles.findByName(input.tenantId, name);
    if (existing) {
      throw new RoleNameAlreadyInUseError(name);
    }

    const uniqueKeys = [...new Set(input.permissionKeys)];
    const found = await this.permissions.findByKeys(uniqueKeys);
    if (found.length !== uniqueKeys.length) {
      const foundKeys = new Set(found.map((p) => p.key));
      const unknown = uniqueKeys.filter((key) => !foundKeys.has(key));
      throw new UnknownPermissionKeysError(unknown);
    }

    const now = new Date();
    const role = Role.create({
      id: newId(),
      tenantId: input.tenantId,
      name,
      isSystem: input.isSystem ?? false,
      permissionKeys: uniqueKeys,
      createdAt: now,
      updatedAt: now,
    });
    await this.roles.save(role);
    return role;
  }
}
