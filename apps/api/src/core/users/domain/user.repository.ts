import { User } from "./user.entity";

/**
 * Port for User persistence. User is a global identity (see class docstring
 * on User) — callers that need tenant-scoped access must go through
 * Membership, owned by the Access Control module. `findAll` is the one
 * deliberate exception: it exists for the platform-admin module
 * (docs/DECISIONS.md ADR-007), which is cross-tenant by nature and gated by
 * `PlatformAdminGuard`, not by tenant context.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(normalizedEmail: string): Promise<User | null>;
  findAll(limit: number): Promise<User[]>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
