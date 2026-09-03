import { Inject, Injectable } from "@nestjs/common";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import { AppDependencyNotSatisfiedError } from "../errors";
import { EnableAppUseCase } from "./enable-app.use-case";

/**
 * Enables every app in the current catalog for one tenant, in dependency
 * order — the real backfill/onboarding counterpart to `EnableAppUseCase`
 * (docs/DECISIONS.md ADR-015). V1 has no per-app opt-in UX during
 * onboarding yet (MASTER_SPEC §68's "elegir aplicaciones" step doesn't
 * exist), so this is what keeps the platform's default behavior
 * unchanged now that `AppEnablementGuard` genuinely blocks a disabled
 * app's routes: every tenant starts with the full catalog enabled,
 * exactly as if the App Registry didn't gate anything yet, and can then
 * disable individual apps for real from the existing "Apps" screen.
 *
 * Ordering is a simple fixed-point iteration rather than a proper
 * topological sort: repeatedly attempt every not-yet-enabled app and stop
 * once a full pass makes no progress. This always terminates and never
 * loops forever, because `validateAppCatalog` (run by `AppCatalogSeeder`
 * before this ever runs) already guarantees the catalog is a real DAG —
 * an app whose dependency isn't enabled yet simply gets retried on the
 * next pass, when that dependency has already succeeded.
 *
 * The returned list is **only the apps genuinely newly enabled by this
 * call**, not every app the tenant ends up with — `EnableAppUseCase` is
 * itself idempotent (a no-op success for an already-ENABLED app), so
 * without tracking prior state here separately, a backfill pass over an
 * already-fully-enabled tenant would misreport every app as "just
 * enabled". `TenantAppEnablementSyncSeeder` relies on an empty list here
 * meaning "nothing changed" to decide whether a tenant needed backfilling
 * at all.
 */
@Injectable()
export class EnableAllCatalogAppsUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
    private readonly enableApp: EnableAppUseCase,
  ) {}

  async execute(tenantId: string): Promise<string[]> {
    const catalog = await this.definitions.findAll();

    const pending = new Set<string>();
    for (const definition of catalog) {
      const existing = await this.tenantApps.findByTenantAndAppDefinition(tenantId, definition.id);
      if (existing?.status !== "ENABLED") pending.add(definition.key);
    }

    const newlyEnabled: string[] = [];
    while (pending.size > 0) {
      let progressed = false;
      for (const key of [...pending]) {
        try {
          await this.enableApp.execute({ tenantId, key });
          pending.delete(key);
          newlyEnabled.push(key);
          progressed = true;
        } catch (error) {
          if (!(error instanceof AppDependencyNotSatisfiedError)) throw error;
          // Dependency not enabled yet in this pass — retried below.
        }
      }
      if (!progressed) break;
    }

    return newlyEnabled;
  }
}
