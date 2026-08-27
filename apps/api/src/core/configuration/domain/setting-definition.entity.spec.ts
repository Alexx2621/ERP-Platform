import { SettingDefinition } from "./setting-definition.entity";

const base = {
  id: "d1",
  key: "localization.currency",
  description: "Currency code",
  createdAt: new Date(),
};

describe("SettingDefinition", () => {
  it("creates a valid definition", () => {
    const definition = SettingDefinition.create({
      ...base,
      dataType: "STRING",
      defaultValue: "USD",
      allowedScopes: ["PLATFORM", "TENANT"],
    });
    expect(definition.allowsScope("TENANT")).toBe(true);
    expect(definition.allowsScope("COMPANY")).toBe(false);
  });

  it("rejects an empty key", () => {
    expect(() =>
      SettingDefinition.create({
        ...base,
        key: "  ",
        dataType: "STRING",
        defaultValue: "USD",
        allowedScopes: ["TENANT"],
      }),
    ).toThrow();
  });

  it("rejects a definition with zero allowed scopes", () => {
    expect(() =>
      SettingDefinition.create({ ...base, dataType: "STRING", defaultValue: "USD", allowedScopes: [] }),
    ).toThrow();
  });

  it("rejects a default value that does not match the declared data type", () => {
    expect(() =>
      SettingDefinition.create({
        ...base,
        dataType: "NUMBER",
        defaultValue: "not-a-number",
        allowedScopes: ["TENANT"],
      }),
    ).toThrow();
  });

  it("assertValidValue throws for a mismatched value and passes for a matching one", () => {
    const definition = SettingDefinition.create({
      ...base,
      dataType: "BOOLEAN",
      defaultValue: false,
      allowedScopes: ["TENANT"],
    });
    expect(() => definition.assertValidValue(true)).not.toThrow();
    expect(() => definition.assertValidValue("true")).toThrow();
  });

  it("JSON data type accepts any defined value, including nested objects", () => {
    const definition = SettingDefinition.create({
      ...base,
      dataType: "JSON",
      defaultValue: { nested: true },
      allowedScopes: ["TENANT"],
    });
    expect(() => definition.assertValidValue({ other: 1 })).not.toThrow();
    expect(() => definition.assertValidValue(null)).not.toThrow();
  });
});
