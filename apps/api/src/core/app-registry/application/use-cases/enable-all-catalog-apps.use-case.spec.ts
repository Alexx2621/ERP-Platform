import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { EnableAllCatalogAppsUseCase } from "./enable-all-catalog-apps.use-case";

async function seedApp(
  definitions: InMemoryAppDefinitionRepository,
  key: string,
  dependsOnKeys: string[] = [],
): Promise<void> {
  const now = new Date();
  await definitions.upsert(
    AppDefinition.create({
      id: newId(),
      key,
      name: key,
      version: "1.0.0",
      kind: "BUSINESS_APP",
      dependsOnKeys,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

describe("EnableAllCatalogAppsUseCase", () => {
  it("enables every catalog app for a tenant, in dependency order", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    // Seeded out of dependency order on purpose — the use case must still converge.
    await seedApp(definitions, "manufacturing", ["catalog", "inventory"]);
    await seedApp(definitions, "inventory", ["catalog", "warehouses"]);
    await seedApp(definitions, "catalog");
    await seedApp(definitions, "warehouses");
    const useCase = new EnableAllCatalogAppsUseCase(
      definitions,
      tenantApps,
      new EnableAppUseCase(definitions, tenantApps),
    );

    const enabledKeys = await useCase.execute("tenant-a");

    expect(enabledKeys.sort()).toEqual(["catalog", "inventory", "manufacturing", "warehouses"]);
    const rows = await tenantApps.findByTenant("tenant-a");
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.status === "ENABLED")).toBe(true);
  });

  it("is idempotent — a second call for an already-fully-enabled tenant enables nothing new", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    const enableApp = new EnableAppUseCase(definitions, tenantApps);
    const useCase = new EnableAllCatalogAppsUseCase(definitions, tenantApps, enableApp);
    await useCase.execute("tenant-a");

    const secondPass = await useCase.execute("tenant-a");

    expect(secondPass).toEqual([]);
    expect(await tenantApps.findByTenant("tenant-a")).toHaveLength(1);
  });

  it("backfills only the apps a partially-enabled tenant is missing", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    await seedApp(definitions, "warehouses");
    const enableApp = new EnableAppUseCase(definitions, tenantApps);
    await enableApp.execute({ tenantId: "tenant-a", key: "catalog" });
    const useCase = new EnableAllCatalogAppsUseCase(definitions, tenantApps, enableApp);

    const enabledKeys = await useCase.execute("tenant-a");

    expect(enabledKeys).toEqual(["warehouses"]);
    expect(await tenantApps.findByTenant("tenant-a")).toHaveLength(2);
  });

  it("keeps tenants independent of each other", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    const useCase = new EnableAllCatalogAppsUseCase(
      definitions,
      tenantApps,
      new EnableAppUseCase(definitions, tenantApps),
    );
    await useCase.execute("tenant-a");

    expect(await tenantApps.findByTenant("tenant-b")).toHaveLength(0);
  });
});
