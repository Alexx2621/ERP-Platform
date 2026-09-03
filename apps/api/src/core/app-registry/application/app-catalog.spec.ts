import { FOUNDATION_APPS, type AppManifest, InvalidAppCatalogError, validateAppCatalog } from "./app-catalog";

function app(key: string, dependsOnKeys: string[] = []): AppManifest {
  return { key, name: key, version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys };
}

describe("validateAppCatalog", () => {
  it("accepts an empty catalog", () => {
    expect(() => validateAppCatalog([])).not.toThrow();
  });

  it("accepts a valid catalog with a diamond dependency graph", () => {
    const catalog = [app("products"), app("inventory", ["products"]), app("purchasing", ["products"]), app("manufacturing", ["products", "inventory", "purchasing"])];
    expect(() => validateAppCatalog(catalog)).not.toThrow();
  });

  it("rejects a duplicate key", () => {
    const catalog = [app("products"), app("products")];
    expect(() => validateAppCatalog(catalog)).toThrow(InvalidAppCatalogError);
  });

  it("rejects a dependency on an unknown key", () => {
    const catalog = [app("manufacturing", ["nonexistent"])];
    expect(() => validateAppCatalog(catalog)).toThrow(InvalidAppCatalogError);
  });

  it("rejects a direct dependency cycle", () => {
    const catalog = [app("a", ["b"]), app("b", ["a"])];
    expect(() => validateAppCatalog(catalog)).toThrow(InvalidAppCatalogError);
  });

  it("rejects an indirect dependency cycle", () => {
    const catalog = [app("a", ["b"]), app("b", ["c"]), app("c", ["a"])];
    expect(() => validateAppCatalog(catalog)).toThrow(InvalidAppCatalogError);
  });
});

describe("FOUNDATION_APPS (docs/DECISIONS.md ADR-015)", () => {
  it("is a valid, acyclic catalog of the 15 real business modules", () => {
    expect(() => validateAppCatalog(FOUNDATION_APPS)).not.toThrow();
    expect(FOUNDATION_APPS.map((manifest) => manifest.key).sort()).toEqual(
      [
        "accounting",
        "catalog",
        "commerce",
        "crm",
        "customers",
        "inventory",
        "manufacturing",
        "payments",
        "pos",
        "pricing",
        "purchasing",
        "sales",
        "suppliers",
        "taxes",
        "warehouses",
      ].sort(),
    );
  });

  it("mirrors each module's real NestJS imports for dependsOnKeys", () => {
    const byKey = new Map(FOUNDATION_APPS.map((manifest) => [manifest.key, manifest.dependsOnKeys]));
    expect(byKey.get("catalog")).toEqual([]);
    expect(byKey.get("customers")).toEqual([]);
    expect(byKey.get("suppliers")).toEqual([]);
    expect(byKey.get("taxes")).toEqual([]);
    expect(byKey.get("warehouses")).toEqual([]);
    expect(byKey.get("accounting")).toEqual([]);
    expect(byKey.get("pricing")).toEqual(["catalog"]);
    expect(byKey.get("crm")).toEqual(["customers"]);
    expect(byKey.get("inventory")).toEqual(["catalog", "warehouses"]);
    expect(byKey.get("sales")).toEqual(["catalog", "warehouses", "taxes", "pricing", "customers", "inventory"]);
    expect(byKey.get("payments")).toEqual(["sales"]);
    expect(byKey.get("purchasing")).toEqual(["catalog", "warehouses", "suppliers", "inventory"]);
    expect(byKey.get("pos")).toEqual(["warehouses", "sales", "payments"]);
    expect(byKey.get("commerce")).toEqual(["catalog", "warehouses", "customers", "sales", "payments"]);
    expect(byKey.get("manufacturing")).toEqual(["catalog", "warehouses", "inventory"]);
  });
});
