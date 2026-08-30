import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { AppDependencyNotSatisfiedError, AppNotFoundError } from "../errors";

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

describe("EnableAppUseCase", () => {
  it("enables an app with no dependencies", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    const useCase = new EnableAppUseCase(definitions, tenantApps);

    const tenantApp = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(tenantApp.status).toBe("ENABLED");
    expect(await tenantApps.findByTenant("tenant-a")).toHaveLength(1);
  });

  it("rejects enabling an unknown app key", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    const useCase = new EnableAppUseCase(definitions, tenantApps);

    await expect(useCase.execute({ tenantId: "tenant-a", key: "unknown" })).rejects.toThrow(
      AppNotFoundError,
    );
  });

  it("rejects enabling an app whose dependency is not enabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await seedApp(definitions, "manufacturing", ["products"]);
    const useCase = new EnableAppUseCase(definitions, tenantApps);

    await expect(useCase.execute({ tenantId: "tenant-a", key: "manufacturing" })).rejects.toThrow(
      AppDependencyNotSatisfiedError,
    );
  });

  it("enables an app once its dependency is enabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await seedApp(definitions, "manufacturing", ["products"]);
    const useCase = new EnableAppUseCase(definitions, tenantApps);
    await useCase.execute({ tenantId: "tenant-a", key: "products" });

    const tenantApp = await useCase.execute({ tenantId: "tenant-a", key: "manufacturing" });

    expect(tenantApp.status).toBe("ENABLED");
  });

  it("is idempotent for an already-enabled app", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    const useCase = new EnableAppUseCase(definitions, tenantApps);
    const first = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    const second = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(second.id).toBe(first.id);
    expect(await tenantApps.findByTenant("tenant-a")).toHaveLength(1);
  });

  it("re-enables a previously disabled app", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    const useCase = new EnableAppUseCase(definitions, tenantApps);
    const tenantApp = await useCase.execute({ tenantId: "tenant-a", key: "products" });
    tenantApp.disable(new Date());
    await tenantApps.save(tenantApp);

    const reEnabled = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(reEnabled.status).toBe("ENABLED");
    expect(reEnabled.disabledAt).toBeNull();
  });

  it("isolates tenants from each other's enablement state", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    const useCase = new EnableAppUseCase(definitions, tenantApps);
    await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(await tenantApps.findByTenant("tenant-b")).toHaveLength(0);
  });
});
