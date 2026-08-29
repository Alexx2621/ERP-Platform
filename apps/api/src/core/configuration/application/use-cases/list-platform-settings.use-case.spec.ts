import { newId } from "@erp/database";
import { InMemorySettingDefinitionRepository } from "../../test-support/in-memory-setting-definition.repository";
import { InMemorySettingValueRepository } from "../../test-support/in-memory-setting-value.repository";
import { SettingDefinition } from "../../domain/setting-definition.entity";
import { SetSettingValueUseCase } from "./set-setting-value.use-case";
import { GetEffectiveSettingUseCase } from "./get-effective-setting.use-case";
import { ListPlatformSettingsUseCase } from "./list-platform-settings.use-case";

describe("ListPlatformSettingsUseCase", () => {
  it("resolves every catalog definition's PLATFORM value, falling back to DEFAULT", async () => {
    const definitions = new InMemorySettingDefinitionRepository();
    const now = new Date();
    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.currency",
        dataType: "STRING",
        description: "x",
        defaultValue: "USD",
        allowedScopes: ["PLATFORM", "TENANT"],
        createdAt: now,
      }),
    );
    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.timezone",
        dataType: "STRING",
        description: "x",
        defaultValue: "UTC",
        allowedScopes: ["PLATFORM", "TENANT"],
        createdAt: now,
      }),
    );
    const values = new InMemorySettingValueRepository();
    const setValue = new SetSettingValueUseCase(definitions, values);
    const getEffective = new GetEffectiveSettingUseCase(definitions, values);
    const listPlatformSettings = new ListPlatformSettingsUseCase(definitions, getEffective);

    await setValue.execute({
      key: "localization.currency",
      scopeType: "PLATFORM",
      tenantId: null,
      companyId: null,
      value: "EUR",
    });

    const result = await listPlatformSettings.execute();

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { key: "localization.currency", value: "EUR", source: "PLATFORM" },
        { key: "localization.timezone", value: "UTC", source: "DEFAULT" },
      ]),
    );
  });

  it("never resolves a TENANT/COMPANY value even if one exists, since no tenant context is given", async () => {
    const definitions = new InMemorySettingDefinitionRepository();
    const now = new Date();
    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.currency",
        dataType: "STRING",
        description: "x",
        defaultValue: "USD",
        allowedScopes: ["PLATFORM", "TENANT"],
        createdAt: now,
      }),
    );
    const values = new InMemorySettingValueRepository();
    const setValue = new SetSettingValueUseCase(definitions, values);
    const getEffective = new GetEffectiveSettingUseCase(definitions, values);
    const listPlatformSettings = new ListPlatformSettingsUseCase(definitions, getEffective);

    await setValue.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "GBP",
    });

    const result = await listPlatformSettings.execute();

    expect(result).toEqual([{ key: "localization.currency", value: "USD", source: "DEFAULT" }]);
  });
});
