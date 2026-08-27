import { newId } from "@erp/database";
import { InMemorySettingDefinitionRepository } from "../../test-support/in-memory-setting-definition.repository";
import { InMemorySettingValueRepository } from "../../test-support/in-memory-setting-value.repository";
import { SettingDefinition } from "../../domain/setting-definition.entity";
import { SetSettingValueUseCase } from "./set-setting-value.use-case";
import {
  CompanyContextRequiredError,
  InvalidSettingValueError,
  ScopeNotAllowedForSettingError,
  SettingDefinitionNotFoundError,
} from "../errors";

async function buildContext(allowedScopes: Array<"PLATFORM" | "TENANT" | "COMPANY"> = ["TENANT", "COMPANY"]) {
  const definitions = new InMemorySettingDefinitionRepository();
  await definitions.upsert(
    SettingDefinition.create({
      id: newId(),
      key: "localization.currency",
      dataType: "STRING",
      description: "x",
      defaultValue: "USD",
      allowedScopes,
      createdAt: new Date(),
    }),
  );
  const values = new InMemorySettingValueRepository();
  const useCase = new SetSettingValueUseCase(definitions, values);
  return { definitions, values, useCase };
}

describe("SetSettingValueUseCase", () => {
  it("sets a TENANT-scoped value", async () => {
    const { useCase, values } = await buildContext();

    const result = await useCase.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });

    expect(result.value).toBe("EUR");
    await expect(
      values.findByScope(result.definitionId, "TENANT", "tenant-a"),
    ).resolves.toMatchObject({ value: "EUR" });
  });

  it("sets a COMPANY-scoped value", async () => {
    const { useCase } = await buildContext();

    const result = await useCase.execute({
      key: "localization.currency",
      scopeType: "COMPANY",
      tenantId: "tenant-a",
      companyId: "company-1",
      value: "GBP",
    });

    expect(result.scopeKey).toBe("tenant-a:company-1");
  });

  it("rejects an unknown setting key", async () => {
    const { useCase } = await buildContext();

    await expect(
      useCase.execute({
        key: "does.not.exist",
        scopeType: "TENANT",
        tenantId: "tenant-a",
        companyId: null,
        value: "x",
      }),
    ).rejects.toThrow(SettingDefinitionNotFoundError);
  });

  it("rejects a scope the definition does not allow", async () => {
    const { useCase } = await buildContext(["PLATFORM"]);

    await expect(
      useCase.execute({
        key: "localization.currency",
        scopeType: "TENANT",
        tenantId: "tenant-a",
        companyId: null,
        value: "EUR",
      }),
    ).rejects.toThrow(ScopeNotAllowedForSettingError);
  });

  it("rejects COMPANY scope without a companyId", async () => {
    const { useCase } = await buildContext();

    await expect(
      useCase.execute({
        key: "localization.currency",
        scopeType: "COMPANY",
        tenantId: "tenant-a",
        companyId: null,
        value: "EUR",
      }),
    ).rejects.toThrow(CompanyContextRequiredError);
  });

  it("rejects a value that does not match the definition's data type", async () => {
    const { useCase } = await buildContext();

    await expect(
      useCase.execute({
        key: "localization.currency",
        scopeType: "TENANT",
        tenantId: "tenant-a",
        companyId: null,
        value: 12345,
      }),
    ).rejects.toThrow(InvalidSettingValueError);
  });

  it("overwrites an existing value at the same scope instead of duplicating it", async () => {
    const { useCase, values } = await buildContext();
    const first = await useCase.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "EUR",
    });
    await useCase.execute({
      key: "localization.currency",
      scopeType: "TENANT",
      tenantId: "tenant-a",
      companyId: null,
      value: "GBP",
    });

    await expect(values.findByScope(first.definitionId, "TENANT", "tenant-a")).resolves.toMatchObject({
      value: "GBP",
    });
  });
});
