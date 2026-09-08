import { Injectable } from "@nestjs/common";
import {
  AppDependencyNotSatisfiedError,
  AppHasActiveDependentsError,
  DisableAppUseCase,
  EnableAppUseCase,
  ListTenantAppsUseCase,
} from "../../../app-registry";

export interface SyncTenantAppsToPlanResult {
  enabled: string[];
  disabled: string[];
}

/**
 * Reconciles a tenant's App Registry enablement state to exactly match a
 * plan's `includesAppKeys` (docs/DECISIONS.md ADR-016 point 6) — the
 * commercial-entitlement layer driving the technical-enablement layer
 * `AppEnablementGuard` already enforces (ADR-015). Reuses
 * `EnableAppUseCase`/`DisableAppUseCase` exactly as built, never
 * duplicating their dependency logic.
 *
 * Two independent fixed-point passes, each always terminating because
 * `validateAppCatalog` already guarantees the app graph is a real DAG
 * (the same reasoning `EnableAllCatalogAppsUseCase` already established):
 * - **Enable pass**: every key in `includedAppKeys` not yet enabled,
 *   retried across passes as its own dependencies get enabled first.
 * - **Disable pass**: every currently-enabled app *not* in
 *   `includedAppKeys`, retried across passes as its own dependents get
 *   disabled first (an app with an active dependent — including one
 *   itself outside the plan and also awaiting disablement — is skipped
 *   and retried, exactly mirroring the enable pass in reverse).
 *
 * Calling with an empty `includedAppKeys` (a real cancellation,
 * `subscription.cancel`) disables every app the tenant currently has.
 */
@Injectable()
export class SyncTenantAppsToPlanUseCase {
  constructor(
    private readonly listTenantApps: ListTenantAppsUseCase,
    private readonly enableApp: EnableAppUseCase,
    private readonly disableApp: DisableAppUseCase,
  ) {}

  async execute(tenantId: string, includedAppKeys: readonly string[]): Promise<SyncTenantAppsToPlanResult> {
    const included = new Set(includedAppKeys);
    const current = await this.listTenantApps.execute(tenantId);
    const currentlyEnabled = new Set(current.filter((app) => app.status === "ENABLED").map((app) => app.key));

    const enabled = await this.runFixedPoint(
      [...included].filter((key) => !currentlyEnabled.has(key)),
      (key) => this.enableApp.execute({ tenantId, key }),
      AppDependencyNotSatisfiedError,
    );

    const disabled = await this.runFixedPoint(
      [...currentlyEnabled].filter((key) => !included.has(key)),
      (key) => this.disableApp.execute({ tenantId, key }),
      AppHasActiveDependentsError,
    );

    return { enabled, disabled };
  }

  private async runFixedPoint(
    initialPending: string[],
    attempt: (key: string) => Promise<unknown>,
    retryableError: new (...args: never[]) => Error,
  ): Promise<string[]> {
    const pending = new Set(initialPending);
    const done: string[] = [];

    while (pending.size > 0) {
      let progressed = false;
      for (const key of [...pending]) {
        try {
          await attempt(key);
          pending.delete(key);
          done.push(key);
          progressed = true;
        } catch (error) {
          if (!(error instanceof retryableError)) throw error;
          // Not resolvable yet in this pass — retried once its own dependency/dependent settles.
        }
      }
      if (!progressed) break;
    }

    return done;
  }
}
