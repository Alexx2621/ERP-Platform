import { newId } from "@erp/database";
import { InMemorySettingDefinitionRepository } from "../../test-support/in-memory-setting-definition.repository";
import { InMemorySettingValueRepository } from "../../test-support/in-memory-setting-value.repository";
import { SettingDefinition } from "../../domain/setting-definition.entity";
import { SetSettingValueUseCase } from "./set-setting-value.use-case";
import { GetEffectiveSettingUseCase } from "./get-effective-setting.use-case";
import { SettingDefinitionNotFoundError } from "../errors";

async function buildContext() {
  const definitions = new InMemorySettingDefinitionRepository();
  await definitions.upsert(
    SettingDefinition.create({
      id: newId(),
      key: "localization.currency",
      dataType: "STRING",
      description: "x",
      defaultValue: "USD",
      allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
      createdAt: new Date(),
    }),
  );
  const values = new InMemorySettingValueRepository();
  const setValue = new SetSettingValueUseCase(definitions, values);
  const getEffective = new GetEffectiveSettingUseCase(definitions, values);
  return { setValue, getEffective };
}

describe("GetEffectiveSettingUseCase", () => {
  it("falls back to the definition's default when nothing is set anywhere", async () => {
    const { getEffective } = await buildContext();

    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-a" }),
    ).resolves.toEqual({ key: "localization.currency", value: "USD", source: "DEFAULT" });
  });

  it("prefers PLATFORM over the default when set", async () => {
    const { setValue, getEffective } = await buildContext();
    await setValue.execute({
      key: "localization.currency",
      scopeType: "PLATFORM",
      tenantId: null,
      companyId: null,
      value: "CAD",
    });

    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-a" }),
    ).resolves.toMatchObject({ value: "CAD", source: "PLATFORM" });
  });

  it("prefers TENANT over PLATFORM", async () => {
    const { setValue, getEffective } = await buildContext();
    await setValue.execute({
      key: "localization.currency",
      scopeType: "PLATFORM",
      tenantId: null,
      companyId: null,
      value: "CAD",
    });
    await setValue.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });

    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-a" }),
    ).resolves.toMatchObject({ value: "EUR", source: "TENANT" });
  });

  it("prefers COMPANY over TENANT", async () => {
    const { setValue, getEffective } = await buildContext();
    await setValue.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });
    await setValue.execute({
      key: "localization.currency",
      scopeType: "COMPANY",
      tenantId: "tenant-a",
      companyId: "company-1",
      value: "GBP",
    });

    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-a", companyId: "company-1" }),
    ).resolves.toMatchObject({ value: "GBP", source: "COMPANY" });
    // A different company in the same tenant still falls back to TENANT.
    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-a", companyId: "company-2" }),
    ).resolves.toMatchObject({ value: "EUR", source: "TENANT" });
  });

  it("never leaks another tenant's TENANT-scoped value", async () => {
    const { setValue, getEffective } = await buildContext();
    await setValue.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });

    await expect(
      getEffective.execute({ key: "localization.currency", tenantId: "tenant-b" }),
    ).resolves.toMatchObject({ value: "USD", source: "DEFAULT" });
  });

  it("rejects an unknown setting key", async () => {
    const { getEffective } = await buildContext();

    await expect(
      getEffective.execute({ key: "does.not.exist", tenantId: "tenant-a" }),
    ).rejects.toThrow(SettingDefinitionNotFoundError);
  });
});
