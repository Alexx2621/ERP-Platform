import type { AppCatalogSeeder, EnableAllCatalogAppsUseCase } from "../../app-registry";
import type { Tenant } from "../domain/tenant.entity";
import type { TenantRepository } from "../domain/tenant.repository";
import { TenantAppEnablementSyncSeeder } from "./tenant-app-enablement-sync-seeder";

function tenant(id: string): Tenant {
  return { id } as unknown as Tenant;
}

describe("TenantAppEnablementSyncSeeder", () => {
  it("seeds the app catalog before backfilling tenants, not relying on onModuleInit ordering", async () => {
    const calls: string[] = [];
    const catalogSeeder = {
      seed: jest.fn().mockImplementation(async () => {
        calls.push("catalog");
      }),
    } as unknown as AppCatalogSeeder;
    const enableAllCatalogApps = {
      execute: jest.fn().mockImplementation(async (tenantId: string) => {
        calls.push(`enable:${tenantId}`);
        return [];
      }),
    } as unknown as EnableAllCatalogAppsUseCase;
    const tenants = {
      findAllActive: jest.fn().mockResolvedValue([tenant("tenant-a")]),
    } as unknown as TenantRepository;

    const seeder = new TenantAppEnablementSyncSeeder(catalogSeeder, enableAllCatalogApps, tenants);
    await seeder.onModuleInit();

    expect(calls).toEqual(["catalog", "enable:tenant-a"]);
  });

  it("backfills every active tenant independently", async () => {
    const catalogSeeder = { seed: jest.fn() } as unknown as AppCatalogSeeder;
    const enableAllCatalogApps = {
      execute: jest.fn().mockResolvedValue(["catalog"]),
    } as unknown as EnableAllCatalogAppsUseCase;
    const tenants = {
      findAllActive: jest.fn().mockResolvedValue([tenant("tenant-a"), tenant("tenant-b")]),
    } as unknown as TenantRepository;

    const seeder = new TenantAppEnablementSyncSeeder(catalogSeeder, enableAllCatalogApps, tenants);
    await seeder.onModuleInit();

    expect(enableAllCatalogApps.execute).toHaveBeenCalledWith("tenant-a");
    expect(enableAllCatalogApps.execute).toHaveBeenCalledWith("tenant-b");
    expect(enableAllCatalogApps.execute).toHaveBeenCalledTimes(2);
  });

  it("does nothing beyond seeding the catalog when there are no active tenants", async () => {
    const catalogSeeder = { seed: jest.fn() } as unknown as AppCatalogSeeder;
    const enableAllCatalogApps = { execute: jest.fn() } as unknown as EnableAllCatalogAppsUseCase;
    const tenants = { findAllActive: jest.fn().mockResolvedValue([]) } as unknown as TenantRepository;

    const seeder = new TenantAppEnablementSyncSeeder(catalogSeeder, enableAllCatalogApps, tenants);
    await seeder.onModuleInit();

    expect(enableAllCatalogApps.execute).not.toHaveBeenCalled();
  });
});
