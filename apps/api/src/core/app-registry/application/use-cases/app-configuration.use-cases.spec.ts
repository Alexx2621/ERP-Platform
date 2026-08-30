import { newId } from "@erp/database";
import { InMemoryAppDefinitionRepository } from "../../test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../test-support/in-memory-tenant-app.repository";
import { InMemoryAppConfigurationRepository } from "../../test-support/in-memory-app-configuration.repository";
import { AppDefinition } from "../../domain/app-definition.entity";
import { EnableAppUseCase } from "./enable-app.use-case";
import { ListAppConfigurationUseCase } from "./list-app-configuration.use-case";
import { SetAppConfigurationUseCase } from "./set-app-configuration.use-case";
import { AppNotEnabledError, AppNotFoundError } from "../errors";

async function buildContext() {
  const definitions = new InMemoryAppDefinitionRepository();
  const tenantApps = new InMemoryTenantAppRepository();
  const configurations = new InMemoryAppConfigurationRepository();
  const now = new Date();
  await definitions.upsert(
    AppDefinition.create({
      id: newId(),
      key: "manufacturing",
      name: "Manufacturing",
      version: "1.0.0",
      kind: "BUSINESS_APP",
      dependsOnKeys: [],
      createdAt: now,
      updatedAt: now,
    }),
  );
  const enableApp = new EnableAppUseCase(definitions, tenantApps);
  const listConfiguration = new ListAppConfigurationUseCase(definitions, tenantApps, configurations);
  const setConfiguration = new SetAppConfigurationUseCase(definitions, tenantApps, configurations);
  return { definitions, tenantApps, configurations, enableApp, listConfiguration, setConfiguration };
}

describe("SetAppConfigurationUseCase / ListAppConfigurationUseCase", () => {
  it("rejects setting configuration for an unknown app key", async () => {
    const { setConfiguration } = await buildContext();
    await expect(
      setConfiguration.execute({ tenantId: "tenant-a", key: "unknown", configKey: "k", value: 1 }),
    ).rejects.toThrow(AppNotFoundError);
  });

  it("rejects setting configuration for an app not enabled by this tenant", async () => {
    const { setConfiguration } = await buildContext();
    await expect(
      setConfiguration.execute({
        tenantId: "tenant-a",
        key: "manufacturing",
        configKey: "default_warehouse",
        value: "wh-1",
      }),
    ).rejects.toThrow(AppNotEnabledError);
  });

  it("sets and lists a configuration value once the app is enabled", async () => {
    const { enableApp, setConfiguration, listConfiguration } = await buildContext();
    await enableApp.execute({ tenantId: "tenant-a", key: "manufacturing" });

    await setConfiguration.execute({
      tenantId: "tenant-a",
      key: "manufacturing",
      configKey: "default_warehouse",
      value: "wh-1",
    });
    const entries = await listConfiguration.execute({ tenantId: "tenant-a", key: "manufacturing" });

    expect(entries).toEqual([expect.objectContaining({ key: "default_warehouse", value: "wh-1" })]);
  });

  it("upserts the same key instead of duplicating it", async () => {
    const { enableApp, setConfiguration, listConfiguration } = await buildContext();
    await enableApp.execute({ tenantId: "tenant-a", key: "manufacturing" });
    await setConfiguration.execute({
      tenantId: "tenant-a",
      key: "manufacturing",
      configKey: "default_warehouse",
      value: "wh-1",
    });

    await setConfiguration.execute({
      tenantId: "tenant-a",
      key: "manufacturing",
      configKey: "default_warehouse",
      value: "wh-2",
    });
    const entries = await listConfiguration.execute({ tenantId: "tenant-a", key: "manufacturing" });

    expect(entries).toHaveLength(1);
    expect(entries[0]!.value).toBe("wh-2");
  });

  it("isolates configuration between tenants", async () => {
    const { enableApp, setConfiguration, listConfiguration } = await buildContext();
    await enableApp.execute({ tenantId: "tenant-a", key: "manufacturing" });
    await enableApp.execute({ tenantId: "tenant-b", key: "manufacturing" });
    await setConfiguration.execute({
      tenantId: "tenant-a",
      key: "manufacturing",
      configKey: "default_warehouse",
      value: "wh-1",
    });

    const entriesForB = await listConfiguration.execute({ tenantId: "tenant-b", key: "manufacturing" });

    expect(entriesForB).toEqual([]);
  });

  it("rejects listing configuration for an app not enabled by this tenant", async () => {
    const { listConfiguration } = await buildContext();
    await expect(
      listConfiguration.execute({ tenantId: "tenant-a", key: "manufacturing" }),
    ).rejects.toThrow(AppNotEnabledError);
  });
});
