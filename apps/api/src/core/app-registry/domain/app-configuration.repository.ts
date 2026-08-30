import { AppConfiguration } from "./app-configuration.entity";

export interface AppConfigurationRepository {
  findByTenantApp(tenantAppId: string): Promise<AppConfiguration[]>;
  findByTenantAppAndKey(tenantAppId: string, key: string): Promise<AppConfiguration | null>;
  /** Upserts by (tenantAppId, key). */
  save(configuration: AppConfiguration): Promise<void>;
}

export const APP_CONFIGURATION_REPOSITORY = Symbol("APP_CONFIGURATION_REPOSITORY");
