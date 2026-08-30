import { TenantApp } from "../domain/tenant-app.entity";
import { TenantAppRepository } from "../domain/tenant-app.repository";

export class InMemoryTenantAppRepository implements TenantAppRepository {
  private readonly byKey = new Map<string, TenantApp>();

  private key(tenantId: string, appDefinitionId: string): string {
    return `${tenantId}:${appDefinitionId}`;
  }

  async findByTenant(tenantId: string): Promise<TenantApp[]> {
    return [...this.byKey.values()].filter((app) => app.tenantId === tenantId);
  }

  async findByTenantAndAppDefinition(tenantId: string, appDefinitionId: string): Promise<TenantApp | null> {
    return this.byKey.get(this.key(tenantId, appDefinitionId)) ?? null;
  }

  async save(tenantApp: TenantApp): Promise<void> {
    this.byKey.set(this.key(tenantApp.tenantId, tenantApp.appDefinitionId), tenantApp);
  }
}
