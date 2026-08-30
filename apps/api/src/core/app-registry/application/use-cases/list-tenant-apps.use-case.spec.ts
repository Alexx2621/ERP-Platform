import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { ListTenantAppsUseCase } from "./list-tenant-apps.use-case";

describe("ListTenantAppsUseCase", () => {
  it("reports DISABLED for an app the tenant never enabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    const now = new Date();
    await definitions.upsert(
      AppDefinition.create({
        id: newId(),
        key: "products",
        name: "Products",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: [],
        createdAt: now,
        updatedAt: now,
      }),
    );
    const useCase = new ListTenantAppsUseCase(definitions, tenantApps);

    const summaries = await useCase.execute("tenant-a");

    expect(summaries).toEqual([
      expect.objectContaining({ key: "products", status: "DISABLED" }),
    ]);
  });

  it("reports ENABLED for an app this tenant enabled, without affecting other tenants", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    const now = new Date();
    await definitions.upsert(
      AppDefinition.create({
        id: newId(),
        key: "products",
        name: "Products",
        version: "1.0.0",
        kind: "BUSINESS_APP",
        dependsOnKeys: [],
        createdAt: now,
        updatedAt: now,
      }),
    );
    await new EnableAppUseCase(definitions, tenantApps).execute({ tenantId: "tenant-a", key: "products" });
    const useCase = new ListTenantAppsUseCase(definitions, tenantApps);

    const forTenantA = await useCase.execute("tenant-a");
    const forTenantB = await useCase.execute("tenant-b");

    expect(forTenantA).toEqual([expect.objectContaining({ key: "products", status: "ENABLED" })]);
    expect(forTenantB).toEqual([expect.objectContaining({ key: "products", status: "DISABLED" })]);
  });

  it("returns an empty list against an empty catalog", async () => {
    const useCase = new ListTenantAppsUseCase(
      new InMemoryAppDefinitionRepository(),
      new InMemoryTenantAppRepository(),
    );

    expect(await useCase.execute("tenant-a")).toEqual([]);
  });
});
