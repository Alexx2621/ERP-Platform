import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { AppDefinition } from "../../domain/app-definition.entity";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TenantApp } from "../../domain/tenant-app.entity";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import { AppDependencyNotSatisfiedError, AppNotFoundError } from "../errors";

export interface EnableAppInput {
  tenantId: string;
  key: string;
}

/**
 * Install+enable collapsed into one idempotent operation (docs/PLUGINS.md
 * §7.1-§7.2, simplified per docs/DECISIONS.md ADR-005 — V1 mínimo has no
 * entitlement/billing gate and nothing app-specific to preflight yet).
 * Enabling an already-ENABLED app is a no-op that still returns the current
 * row, satisfying "es idempotente" (§7.1) without a spurious write.
 */
@Injectable()
export class EnableAppUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
  ) {}

  async execute(input: EnableAppInput): Promise<TenantApp> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) {
      throw new AppNotFoundError(input.key);
    }

    if (definition.dependsOnKeys.length > 0) {
      const missing = await this.findUnsatisfiedDependencies(input.tenantId, definition);
      if (missing.length > 0) {
        throw new AppDependencyNotSatisfiedError(missing);
      }
    }

    const now = new Date();
    const existing = await this.tenantApps.findByTenantAndAppDefinition(input.tenantId, definition.id);
    if (existing) {
      if (existing.status === "DISABLED") {
        existing.enable(now);
        await this.tenantApps.save(existing);
      }
      return existing;
    }

    const tenantApp = TenantApp.create({
      id: newId(),
      tenantId: input.tenantId,
      appDefinitionId: definition.id,
      status: "ENABLED",
      enabledAt: now,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await this.tenantApps.save(tenantApp);
    return tenantApp;
  }

  private async findUnsatisfiedDependencies(tenantId: string, definition: AppDefinition): Promise<string[]> {
    const missing: string[] = [];
    for (const dependencyKey of definition.dependsOnKeys) {
      const dependency = await this.definitions.findByKey(dependencyKey);
      if (!dependency) {
        missing.push(dependencyKey);
        continue;
      }
      const dependencyTenantApp = await this.tenantApps.findByTenantAndAppDefinition(tenantId, dependency.id);
      if (!dependencyTenantApp || dependencyTenantApp.status !== "ENABLED") {
        missing.push(dependencyKey);
      }
    }
    return missing;
  }
}
