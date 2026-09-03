import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { IsAppEnabledForTenantUseCase } from "./is-app-enabled-for-tenant.use-case";

async function seedApp(definitions: InMemoryAppDefinitionRepository, key: string): Promise<void> {
  const now = new Date();
  await definitions.upsert(
    AppDefinition.create({
      id: newId(),
      key,
      name: key,
      version: "1.0.0",
      kind: "BUSINESS_APP",
      dependsOnKeys: [],
      createdAt: now,
      updatedAt: now,
    }),
  );
}

describe("IsAppEnabledForTenantUseCase", () => {
  it("returns true once the app is enabled for the tenant", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    await new EnableAppUseCase(definitions, tenantApps).execute({ tenantId: "tenant-a", key: "catalog" });
    const useCase = new IsAppEnabledForTenantUseCase(definitions, tenantApps);

    expect(await useCase.execute({ tenantId: "tenant-a", key: "catalog" })).toBe(true);
  });

  it("fails closed for an unknown app key", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    const useCase = new IsAppEnabledForTenantUseCase(definitions, tenantApps);

    expect(await useCase.execute({ tenantId: "tenant-a", key: "unknown" })).toBe(false);
  });

  it("fails closed for a tenant that never enabled the app", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    const useCase = new IsAppEnabledForTenantUseCase(definitions, tenantApps);

    expect(await useCase.execute({ tenantId: "tenant-a", key: "catalog" })).toBe(false);
  });

  it("fails closed once the app has been disabled again", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    const enableApp = new EnableAppUseCase(definitions, tenantApps);
    const tenantApp = await enableApp.execute({ tenantId: "tenant-a", key: "catalog" });
    tenantApp.disable(new Date());
    await tenantApps.save(tenantApp);
    const useCase = new IsAppEnabledForTenantUseCase(definitions, tenantApps);

    expect(await useCase.execute({ tenantId: "tenant-a", key: "catalog" })).toBe(false);
  });

  it("does not leak one tenant's enablement to another", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "catalog");
    await new EnableAppUseCase(definitions, tenantApps).execute({ tenantId: "tenant-a", key: "catalog" });
    const useCase = new IsAppEnabledForTenantUseCase(definitions, tenantApps);

    expect(await useCase.execute({ tenantId: "tenant-b", key: "catalog" })).toBe(false);
  });
});
