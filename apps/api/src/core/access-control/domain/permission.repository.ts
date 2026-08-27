import { Permission } from "./permission.entity";

export interface PermissionRepository {
  findByKey(key: string): Promise<Permission | null>;
  findByKeys(keys: string[]): Promise<Permission[]>;
  findAll(): Promise<Permission[]>;
  /** Idempotent by `key` — used only by PermissionCatalogSeeder, never by request handlers. */
  upsert(permission: Permission): Promise<void>;
}

export const PERMISSION_REPOSITORY = Symbol("PERMISSION_REPOSITORY");
