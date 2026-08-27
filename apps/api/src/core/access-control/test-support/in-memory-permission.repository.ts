import { Permission } from "../domain/permission.entity";
import { PermissionRepository } from "../domain/permission.repository";

export class InMemoryPermissionRepository implements PermissionRepository {
  private readonly byKey = new Map<string, Permission>();

  async findByKey(key: string): Promise<Permission | null> {
    return this.byKey.get(key) ?? null;
  }

  async findByKeys(keys: string[]): Promise<Permission[]> {
    return keys.map((key) => this.byKey.get(key)).filter((p): p is Permission => Boolean(p));
  }

  async findAll(): Promise<Permission[]> {
    return [...this.byKey.values()];
  }

  async upsert(permission: Permission): Promise<void> {
    this.byKey.set(permission.key, permission);
  }
}
