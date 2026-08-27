import { Role } from "./role.entity";

export interface RoleRepository {
  findById(tenantId: string, id: string): Promise<Role | null>;
  findByIds(tenantId: string, ids: string[]): Promise<Role[]>;
  findByName(tenantId: string, name: string): Promise<Role | null>;
  findByTenant(tenantId: string): Promise<Role[]>;
  save(role: Role): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");
