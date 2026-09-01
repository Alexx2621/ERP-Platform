import { Role } from "../domain/role.entity";
import { RoleRepository } from "../domain/role.repository";

export class InMemoryRoleRepository implements RoleRepository {
  private readonly byId = new Map<string, Role>();

  async findById(tenantId: string, id: string): Promise<Role | null> {
    const role = this.byId.get(id);
    return role && role.tenantId === tenantId ? role : null;
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Role[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter((role): role is Role => Boolean(role) && role!.tenantId === tenantId);
  }

  async findByName(tenantId: string, name: string): Promise<Role | null> {
    for (const role of this.byId.values()) {
      if (role.tenantId === tenantId && role.name === name) return role;
    }
    return null;
  }

  async findByTenant(tenantId: string): Promise<Role[]> {
    return [...this.byId.values()].filter((role) => role.tenantId === tenantId);
  }

  async findSystemRolesByName(name: string): Promise<Role[]> {
    return [...this.byId.values()].filter((role) => role.isSystem && role.name === name);
  }

  async save(role: Role): Promise<void> {
    this.byId.set(role.id, role);
  }
}
