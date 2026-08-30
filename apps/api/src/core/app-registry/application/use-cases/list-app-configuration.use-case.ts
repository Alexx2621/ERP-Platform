import { Inject, Injectable } from "@nestjs/common";
import { AppConfiguration } from "../../domain/app-configuration.entity";
import { APP_CONFIGURATION_REPOSITORY, AppConfigurationRepository } from "../../domain/app-configuration.repository";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";
import { TENANT_APP_REPOSITORY, TenantAppRepository } from "../../domain/tenant-app.repository";
import { AppNotEnabledError, AppNotFoundError } from "../errors";

export interface ListAppConfigurationInput {
  tenantId: string;
  key: string;
}

@Injectable()
export class ListAppConfigurationUseCase {
  constructor(
    @Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository,
    @Inject(TENANT_APP_REPOSITORY) private readonly tenantApps: TenantAppRepository,
    @Inject(APP_CONFIGURATION_REPOSITORY) private readonly configurations: AppConfigurationRepository,
  ) {}

  async execute(input: ListAppConfigurationInput): Promise<AppConfiguration[]> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) {
      throw new AppNotFoundError(input.key);
    }
    const tenantApp = await this.tenantApps.findByTenantAndAppDefinition(input.tenantId, definition.id);
    if (!tenantApp || tenantApp.status !== "ENABLED") {
      throw new AppNotEnabledError(input.key);
    }
    return this.configurations.findByTenantApp(tenantApp.id);
  }
}
