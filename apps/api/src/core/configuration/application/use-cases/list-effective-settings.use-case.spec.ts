import { newId } from "@erp/database";
import { InMemorySettingDefinitionRepository } from "../../test-support/in-memory-setting-definition.repository";
import { InMemorySettingValueRepository } from "../../test-support/in-memory-setting-value.repository";
import { SettingDefinition } from "../../domain/setting-definition.entity";
import { SetSettingValueUseCase } from "./set-setting-value.use-case";
import { GetEffectiveSettingUseCase } from "./get-effective-setting.use-case";
import { ListEffectiveSettingsUseCase } from "./list-effective-settings.use-case";

describe("ListEffectiveSettingsUseCase", () => {
  it("resolves every catalog definition for the given tenant/company context", async () => {
    const definitions = new InMemorySettingDefinitionRepository();
    const now = new Date();
    await definitions.upsert(
      SettingDefinition.create({
        id: newId(),
        key: "localization.currency",
        dataType: "STRING",
        description: "x",
        defaultValue: "USD",
        allowedScopes: ["TENANT"],
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
        allowedScopes: ["TENANT"],
        createdAt: now,
      }),
    );
    const values = new InMemorySettingValueRepository();
    const setValue = new SetSettingValueUseCase(definitions, values);
    const getEffective = new GetEffectiveSettingUseCase(definitions, values);
    const listEffective = new ListEffectiveSettingsUseCase(definitions, getEffective);

    await setValue.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });

    const result = await listEffective.execute({ tenantId: "tenant-a" });

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { key: "localization.currency", value: "EUR", source: "TENANT" },
        { key: "localization.timezone", value: "UTC", source: "DEFAULT" },
      ]),
    );
  });
});
