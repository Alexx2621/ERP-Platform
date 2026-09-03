import { Inject, Injectable } from "@nestjs/common";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";

export interface IsAppEnabledForTenantInput {
  tenantId: string;
  key: string;
}

/**
 * The single real check `AppEnablementGuard` runs on every gated request
 * (docs/DECISIONS.md ADR-015). Fails closed on both an unknown app key and
 * a tenant that never enabled it — neither is treated as "enabled by
 * default".
 */
@Injectable()
export class IsAppEnabledForTenantUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
  ) {}

  async execute(input: IsAppEnabledForTenantInput): Promise<boolean> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) return false;

    const tenantApp = await this.tenantApps.findByTenantAndAppDefinition(input.tenantId, definition.id);
    return tenantApp?.status === "ENABLED";
  }
}
