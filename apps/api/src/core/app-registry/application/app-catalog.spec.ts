import { type AppManifest, InvalidAppCatalogError, validateAppCatalog } from "./app-catalog";

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
