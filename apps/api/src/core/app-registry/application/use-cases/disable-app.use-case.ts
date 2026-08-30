import { Inject, Injectable } from "@nestjs/common";
import { TenantApp } from "../../domain/tenant-app.entity";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import { AppHasActiveDependentsError, AppNotEnabledError, AppNotFoundError } from "../errors";

export interface DisableAppInput {
  tenantId: string;
  key: string;
}

/**
 * Rejects disabling an app that another enabled app still depends on
 * (docs/PLUGINS.md §6: "Deshabilitar una app con dependents activos se
 * rechaza"). Re-disabling an already-DISABLED app is idempotent (returns
 * the current row unchanged); disabling an app that was never enabled is a
 * real input error (AppNotEnabledError), not treated as a no-op — there is
 * no prior "enable" for a second call to be idempotent against.
 */
@Injectable()
export class DisableAppUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
  ) {}

  async execute(input: DisableAppInput): Promise<TenantApp> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) {
      throw new AppNotFoundError(input.key);
    }

    const tenantApp = await this.tenantApps.findByTenantAndAppDefinition(input.tenantId, definition.id);
    if (!tenantApp) {
      throw new AppNotEnabledError(input.key);
    }
    if (tenantApp.status === "DISABLED") {
      return tenantApp;
    }

    const allDefinitions = await this.definitions.findAll();
    const dependents = allDefinitions.filter((candidate) => candidate.dependsOnKeys.includes(definition.key));
    const activeDependentKeys: string[] = [];
    for (const dependent of dependents) {
      const dependentTenantApp = await this.tenantApps.findByTenantAndAppDefinition(
        input.tenantId,
        dependent.id,
      );
      if (dependentTenantApp?.status === "ENABLED") {
        activeDependentKeys.push(dependent.key);
      }
    }
    if (activeDependentKeys.length > 0) {
      throw new AppHasActiveDependentsError(activeDependentKeys);
    }

    tenantApp.disable(new Date());
    await this.tenantApps.save(tenantApp);
    return tenantApp;
  }
}
