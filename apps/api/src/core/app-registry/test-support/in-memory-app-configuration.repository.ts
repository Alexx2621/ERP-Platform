import { AppConfiguration } from "../domain/app-configuration.entity";
import { AppConfigurationRepository } from "../domain/app-configuration.repository";

export class InMemoryAppConfigurationRepository implements AppConfigurationRepository {
  private readonly byKey = new Map<string, AppConfiguration>();

  private key(tenantAppId: string, key: string): string {
    return `${tenantAppId}:${key}`;
  }

  async findByTenantApp(tenantAppId: string): Promise<AppConfiguration[]> {
    return [...this.byKey.values()].filter((config) => config.tenantAppId === tenantAppId);
  }

  async findByTenantAppAndKey(tenantAppId: string, key: string): Promise<AppConfiguration | null> {
    return this.byKey.get(this.key(tenantAppId, key)) ?? null;
  }

  async save(configuration: AppConfiguration): Promise<void> {
    this.byKey.set(this.key(configuration.tenantAppId, configuration.key), configuration);
  }
}
