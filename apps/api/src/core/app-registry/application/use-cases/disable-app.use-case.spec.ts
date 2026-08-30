import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { DisableAppUseCase } from "./disable-app.use-case";
import { AppHasActiveDependentsError, AppNotEnabledError, AppNotFoundError } from "../errors";

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

describe("DisableAppUseCase", () => {
  it("disables an enabled app", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await new EnableAppUseCase(definitions, tenantApps).execute({ tenantId: "tenant-a", key: "products" });
    const useCase = new DisableAppUseCase(definitions, tenantApps);

    const tenantApp = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(tenantApp.status).toBe("DISABLED");
    expect(tenantApp.disabledAt).not.toBeNull();
  });

  it("rejects disabling an unknown app key", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    const useCase = new DisableAppUseCase(definitions, tenantApps);

    await expect(useCase.execute({ tenantId: "tenant-a", key: "unknown" })).rejects.toThrow(AppNotFoundError);
  });

  it("rejects disabling an app that was never enabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    const useCase = new DisableAppUseCase(definitions, tenantApps);

    await expect(useCase.execute({ tenantId: "tenant-a", key: "products" })).rejects.toThrow(
      AppNotEnabledError,
    );
  });

  it("is idempotent for an already-disabled app", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await new EnableAppUseCase(definitions, tenantApps).execute({ tenantId: "tenant-a", key: "products" });
    const useCase = new DisableAppUseCase(definitions, tenantApps);
    await useCase.execute({ tenantId: "tenant-a", key: "products" });

    const second = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(second.status).toBe("DISABLED");
  });

  it("rejects disabling a dependency while a dependent app is still enabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await seedApp(definitions, "manufacturing", ["products"]);
    const enable = new EnableAppUseCase(definitions, tenantApps);
    await enable.execute({ tenantId: "tenant-a", key: "products" });
    await enable.execute({ tenantId: "tenant-a", key: "manufacturing" });
    const useCase = new DisableAppUseCase(definitions, tenantApps);

    await expect(useCase.execute({ tenantId: "tenant-a", key: "products" })).rejects.toThrow(
      AppHasActiveDependentsError,
    );
  });

  it("allows disabling a dependency once the dependent app is disabled", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await seedApp(definitions, "manufacturing", ["products"]);
    const enable = new EnableAppUseCase(definitions, tenantApps);
    await enable.execute({ tenantId: "tenant-a", key: "products" });
    await enable.execute({ tenantId: "tenant-a", key: "manufacturing" });
    const useCase = new DisableAppUseCase(definitions, tenantApps);
    await useCase.execute({ tenantId: "tenant-a", key: "manufacturing" });

    const tenantApp = await useCase.execute({ tenantId: "tenant-a", key: "products" });

    expect(tenantApp.status).toBe("DISABLED");
  });

  it("isolates tenants from each other's dependents check", async () => {
    const definitions = new InMemoryAppDefinitionRepository();
    const tenantApps = new InMemoryTenantAppRepository();
    await seedApp(definitions, "products");
    await seedApp(definitions, "manufacturing", ["products"]);
    const enable = new EnableAppUseCase(definitions, tenantApps);
    await enable.execute({ tenantId: "tenant-a", key: "products" });
    await enable.execute({ tenantId: "tenant-a", key: "manufacturing" });
    await enable.execute({ tenantId: "tenant-b", key: "products" });
    const useCase = new DisableAppUseCase(definitions, tenantApps);

    const tenantApp = await useCase.execute({ tenantId: "tenant-b", key: "products" });

    expect(tenantApp.status).toBe("DISABLED");
  });
});
