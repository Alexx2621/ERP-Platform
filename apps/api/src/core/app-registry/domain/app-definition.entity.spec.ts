import { AppDefinition } from "./app-definition.entity";

const base = {
  id: "a1",
  name: "Manufacturing",
  version: "1.0.0",
  kind: "BUSINESS_APP" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AppDefinition", () => {
  it("accepts a lowercase kebab-case key", () => {
    const definition = AppDefinition.create({ ...base, key: "manufacturing", dependsOnKeys: [] });
    expect(definition.key).toBe("manufacturing");
  });

  it("rejects an uppercase key", () => {
    expect(() => AppDefinition.create({ ...base, key: "Manufacturing", dependsOnKeys: [] })).toThrow();
  });

  it("rejects a key with underscores", () => {
    expect(() => AppDefinition.create({ ...base, key: "manufacturing_v2", dependsOnKeys: [] })).toThrow();
  });

  it("rejects a key starting with a digit", () => {
    expect(() => AppDefinition.create({ ...base, key: "2fa", dependsOnKeys: [] })).toThrow();
  });

  it("rejects a self-dependency", () => {
    expect(() =>
      AppDefinition.create({ ...base, key: "manufacturing", dependsOnKeys: ["manufacturing"] }),
    ).toThrow();
  });

  it("toProps returns a defensive copy of dependsOnKeys", () => {
    const dependsOnKeys = ["products"];
    const definition = AppDefinition.create({ ...base, key: "manufacturing", dependsOnKeys });
    const props = definition.toProps();
    (props.dependsOnKeys as string[]).push("mutated");
    expect(definition.dependsOnKeys).toEqual(["products"]);
  });
});
