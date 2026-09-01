import { Role } from "./role.entity";

export interface RoleRepository {
  findById(tenantId: string, id: string): Promise<Role | null>;
  findByIds(tenantId: string, ids: string[]): Promise<Role[]>;
  findByName(tenantId: string, name: string): Promise<Role | null>;
  findByTenant(tenantId: string): Promise<Role[]>;
  /**
   * Cross-tenant by design — the one deliberate exception to "every query is
   * tenant-scoped" in this repository, same reasoning as
   * `UserRepository.findAll` (ADR-007): syncing a system role's permissions
   * with the platform-wide permission catalog is inherently a platform-wide
   * operation, not a per-tenant one. Filters to `isSystem: true` so a
   * tenant's own custom role that happens to share a system role's name is
   * never touched.
   */
  findSystemRolesByName(name: string): Promise<Role[]>;
  save(role: Role): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");
