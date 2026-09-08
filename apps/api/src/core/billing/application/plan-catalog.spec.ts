import { FOUNDATION_APPS } from "../../app-registry";
import { FOUNDATION_PLANS, InvalidPlanCatalogError, type PlanManifest, validatePlanCatalog } from "./plan-catalog";

function plan(key: string, includesAppKeys: string[]): PlanManifest {
  return {
    key,
    name: key,
    description: key,
    currency: "GTQ",
    basePriceAmount: "0.0000",
    perUserPriceAmount: "0.0000",
    isSelfServe: true,
    includesAppKeys,
  };
}

describe("validatePlanCatalog", () => {
  it("accepts an empty catalog", () => {
    expect(() => validatePlanCatalog([])).not.toThrow();
  });

  it("accepts a plan whose includesAppKeys is dependency-closed", () => {
    const catalog = [plan("starter", ["catalog", "pricing"])];
    expect(() => validatePlanCatalog(catalog)).not.toThrow();
  });

  it("rejects a duplicate plan key", () => {
    const catalog = [plan("starter", []), plan("starter", [])];
    expect(() => validatePlanCatalog(catalog)).toThrow(InvalidPlanCatalogError);
  });

  it("rejects a plan that includes an unknown app key", () => {
    const catalog = [plan("starter", ["nonexistent-app"])];
    expect(() => validatePlanCatalog(catalog)).toThrow(InvalidPlanCatalogError);
  });

  it("rejects a plan that includes an app without its required dependency", () => {
    // "pricing" depends on "catalog" in the real FOUNDATION_APPS graph.
    const catalog = [plan("starter", ["pricing"])];
    expect(() => validatePlanCatalog(catalog)).toThrow(InvalidPlanCatalogError);
  });

  it("rejects a plan missing a transitive dependency (sales needs inventory, which needs warehouses)", () => {
    const catalog = [plan("starter", ["catalog", "taxes", "pricing", "customers", "inventory", "sales"])];
    expect(() => validatePlanCatalog(catalog)).toThrow(InvalidPlanCatalogError);
  });
});

describe("FOUNDATION_PLANS (docs/DECISIONS.md ADR-016)", () => {
  it("is a valid, dependency-closed catalog of the 4 real GTQ plans", () => {
    expect(() => validatePlanCatalog(FOUNDATION_PLANS)).not.toThrow();
    expect(FOUNDATION_PLANS.map((p) => p.key).sort()).toEqual(["business", "enterprise", "profesional", "starter"]);
  });

  it("prices every plan in GTQ", () => {
    for (const p of FOUNDATION_PLANS) {
      expect(p.currency).toBe("GTQ");
    }
  });

  it("marks Enterprise as sales-assisted, not self-serve", () => {
    const enterprise = FOUNDATION_PLANS.find((p) => p.key === "enterprise");
    expect(enterprise?.isSelfServe).toBe(false);
  });

  it("marks Starter/Profesional/Business as self-serve", () => {
    for (const key of ["starter", "profesional", "business"]) {
      expect(FOUNDATION_PLANS.find((p) => p.key === key)?.isSelfServe).toBe(true);
    }
  });

  it("gives Business and Enterprise the full 15-app catalog, with no 16th app to differentiate them", () => {
    const business = FOUNDATION_PLANS.find((p) => p.key === "business");
    const enterprise = FOUNDATION_PLANS.find((p) => p.key === "enterprise");
    expect([...(business?.includesAppKeys ?? [])].sort()).toEqual(FOUNDATION_APPS.map((a) => a.key).sort());
    expect([...(enterprise?.includesAppKeys ?? [])].sort()).toEqual(FOUNDATION_APPS.map((a) => a.key).sort());
  });

  it("orders tiers with strictly increasing app coverage: starter ⊂ profesional ⊂ business", () => {
    const starter = new Set(FOUNDATION_PLANS.find((p) => p.key === "starter")?.includesAppKeys ?? []);
    const profesional = new Set(FOUNDATION_PLANS.find((p) => p.key === "profesional")?.includesAppKeys ?? []);
    const business = new Set(FOUNDATION_PLANS.find((p) => p.key === "business")?.includesAppKeys ?? []);
    for (const key of starter) expect(profesional.has(key)).toBe(true);
    for (const key of profesional) expect(business.has(key)).toBe(true);
    expect(profesional.size).toBeGreaterThan(starter.size);
    expect(business.size).toBeGreaterThan(profesional.size);
  });
});
