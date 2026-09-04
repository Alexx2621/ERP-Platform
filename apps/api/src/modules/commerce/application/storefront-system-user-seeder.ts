import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { newId } from "@erp/database";
import { normalizeEmail, USER_REPOSITORY, User, UserRepository } from "../../../core/users";

const SYSTEM_USER_EMAIL = "storefront-system@platform.internal";

/**
 * Every inventory movement in this codebase requires a real, non-null
 * actor (`InventoryMovement.createdByUserId`) — a constraint designed
 * around staff acting through an authenticated session, which a public,
 * anonymous storefront checkout has none of. Rather than relaxing that
 * `NOT NULL` for every other module too, or misattributing an anonymous
 * order to whichever staff member happens to be logged in elsewhere, this
 * seeds one real, well-known, non-interactive `User` row — "Storefront
 * System" — the same code-owned, upserted-at-boot pattern already used for
 * the permission catalog (`PermissionCatalogSeeder`) and the app registry
 * catalog. It is never given a `UserCredential`, so it can never log in;
 * `CheckoutUseCase` is its only caller. `ensureSeeded()` is exposed (not
 * only `onModuleInit`) so callers never depend on Nest's same-module boot
 * ordering — the same lesson `OwnerRolePermissionSyncSeeder` already
 * applied — and the resolved id is cached after the first real lookup.
 * Always logs once per boot, whether it created the row or found it
 * already there — same "log a status line every run, not just on change"
 * bar the other backfill seeders in this codebase already set
 * (`TenantAppEnablementSyncSeeder`/`SyncOwnerRolePermissionsUseCase` log
 * "N of M..." unconditionally); a silent success on the common
 * already-seeded path would be indistinguishable from the seeder never
 * running at all.
 */
@Injectable()
export class StorefrontSystemUserSeeder implements OnModuleInit {
  private readonly logger = new Logger(StorefrontSystemUserSeeder.name);
  private systemUserId: string | null = null;

  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  async ensureSeeded(): Promise<string> {
    if (this.systemUserId) {
      return this.systemUserId;
    }
    const email = normalizeEmail(SYSTEM_USER_EMAIL);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      this.systemUserId = existing.id;
      this.logger.log("Storefront system user already seeded.");
      return existing.id;
    }
    const now = new Date();
    const user = User.create({
      id: newId(),
      email,
      displayName: "Storefront System",
      status: "ACTIVE",
      isPlatformAdmin: false,
      createdAt: now,
      updatedAt: now,
    });
    await this.users.save(user);
    this.logger.log("Storefront system user seeded.");
    this.systemUserId = user.id;
    return user.id;
  }
}
