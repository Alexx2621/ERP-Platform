import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { AppConfiguration } from "../../domain/app-configuration.entity";
import { APP_CONFIGURATION_REPOSITORY, AppConfigurationRepository } from "../../domain/app-configuration.repository";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import { AppNotEnabledError, AppNotFoundError } from "../errors";

export interface SetAppConfigurationInput {
  tenantId: string;
  key: string;
  configKey: string;
  value: unknown;
}

/** Requires the app to be currently ENABLED for the tenant — configuring a disabled app is not a real workflow yet (docs/PLUGINS.md §11.2). */
@Injectable()
export class SetAppConfigurationUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
    @Inject(APP_CONFIGURATION_REPOSITORY) private readonly configurations: AppConfigurationRepository,
  ) {}

  async execute(input: SetAppConfigurationInput): Promise<AppConfiguration> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) {
      throw new AppNotFoundError(input.key);
    }
    const tenantApp = await this.tenantApps.findByTenantAndAppDefinition(input.tenantId, definition.id);
    if (!tenantApp || tenantApp.status !== "ENABLED") {
      throw new AppNotEnabledError(input.key);
    }

    const now = new Date();
    const existing = await this.configurations.findByTenantAppAndKey(tenantApp.id, input.configKey);
    const configuration = AppConfiguration.create({
      id: existing?.id ?? newId(),
      tenantAppId: tenantApp.id,
      key: input.configKey,
      value: input.value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.configurations.save(configuration);
    return configuration;
  }
}
