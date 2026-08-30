import { Inject, Injectable } from "@nestjs/common";
import type { AppKind } from "../../domain/app-definition.entity";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import type { TenantAppStatus } from "../../domain/tenant-app.entity";

export interface TenantAppSummary {
  key: string;
  name: string;
  version: string;
  kind: AppKind;
  dependsOnKeys: readonly string[];
  status: TenantAppStatus;
}

/**
 * The catalog joined with the calling tenant's own enablement state — what
 * an "Apps" screen needs in one call (MASTER_SPEC §16's mockup: "✓ Products
 * ○ CRM"). An app the tenant never enabled reports DISABLED, not a
 * separate AVAILABLE state — see docs/DECISIONS.md ADR-005 for why V1
 * mínimo has only two real states.
 */
@Injectable()
export class ListTenantAppsUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
  ) {}

  async execute(tenantId: string): Promise<TenantAppSummary[]> {
    const [allDefinitions, installed] = await Promise.all([
      this.definitions.findAll(),
      this.tenantApps.findByTenant(tenantId),
    ]);
    const statusByDefinitionId = new Map(installed.map((app) => [app.appDefinitionId, app.status]));

    return allDefinitions.map((definition) => ({
      key: definition.key,
      name: definition.name,
      version: definition.version,
      kind: definition.kind,
      dependsOnKeys: definition.dependsOnKeys,
      status: statusByDefinitionId.get(definition.id) ?? "DISABLED",
    }));
  }
}
