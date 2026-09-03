import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AppCatalogSeeder, EnableAllCatalogAppsUseCase } from "../../app-registry";
import { TENANT_REPOSITORY, TenantRepository } from "../domain/tenant.repository";

/**
 * Runs on every API boot, right after the app catalog itself is seeded —
 * same "explicitly await the other seeder, don't rely on same-module
 * onModuleInit ordering" pattern `OwnerRolePermissionSyncSeeder` already
 * established for the permission catalog (docs/PROJECT_STATE.md "Corregido
 * durante la implementación de RBAC").
 *
 * Backfills every already-provisioned, ACTIVE tenant with any catalog app
 * it hasn't enabled yet (docs/DECISIONS.md ADR-015) — without this, the
 * moment `AppEnablementGuard` started enforcing real gating, every
 * existing tenant would have lost access to every business module at
 * once, since `tenant_apps` starts empty for all of them. Idempotent:
 * `EnableAllCatalogAppsUseCase` only writes rows for apps not already
 * enabled.
 */
@Injectable()
export class TenantAppEnablementSyncSeeder implements OnModuleInit {
  private readonly logger = new Logger(TenantAppEnablementSyncSeeder.name);

  constructor(
    private readonly catalogSeeder: AppCatalogSeeder,
    private readonly enableAllCatalogApps: EnableAllCatalogAppsUseCase,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.catalogSeeder.seed();

    const activeTenants = await this.tenants.findAllActive();
    let updatedCount = 0;
    for (const tenant of activeTenants) {
      const enabledKeys = await this.enableAllCatalogApps.execute(tenant.id);
      if (enabledKeys.length > 0) updatedCount += 1;
    }

    this.logger.log(
      `Tenant app enablement sync: ${updatedCount} of ${activeTenants.length} active tenant(s) had new apps enabled.`,
    );
  }
}
