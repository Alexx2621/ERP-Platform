import type { AppKind } from "../domain/app-definition.entity";

export interface AppManifest {
  key: string;
  name: string;
  version: string;
  kind: AppKind;
  dependsOnKeys: readonly string[];
}

/**
 * Code-owned app catalog (docs/PLUGINS.md §3.4, §13; docs/ARCHITECTURE.md
 * §8.2). Seeded idempotently by AppCatalogSeeder, same pattern as
 * FOUNDATION_PERMISSIONS/setting-catalog.ts. Core capabilities themselves
 * are never app-registrable (docs/ARCHITECTURE.md §5.3-§5.4) — always-on
 * for every tenant, not optional — so only `apps/api/src/modules/*`
 * business modules appear here, never Auth/Tenants/AccessControl/Audit/etc.
 *
 * Phase 11 (docs/ROADMAP.md §15, docs/DECISIONS.md ADR-015) populates this
 * catalog for the first time with the 15 real business modules built
 * across Phases 2-10, one entry per NestJS module, `dependsOnKeys`
 * mirroring each module's real `imports` array exactly (verified by
 * inspection, not guessed) — the same directed acyclic graph
 * `validateAppCatalog` already enforces. Every one of these apps is
 * enforced for real by `AppEnablementGuard` on its own controllers
 * (`docs/SECURITY.md` "App Registry"), not merely listed for display.
 */
export const FOUNDATION_APPS: readonly AppManifest[] = [
  { key: "catalog", name: "Catálogo", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "customers", name: "Clientes", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "suppliers", name: "Proveedores", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "taxes", name: "Impuestos", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "warehouses", name: "Bodegas", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "accounting", name: "Contabilidad", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [] },
  { key: "pricing", name: "Precios", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: ["catalog"] },
  { key: "crm", name: "CRM", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: ["customers"] },
  { key: "inventory", name: "Inventario", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: ["catalog", "warehouses"] },
  {
    key: "sales",
    name: "Ventas",
    version: "1.0.0",
    kind: "BUSINESS_APP",
    dependsOnKeys: ["catalog", "warehouses", "taxes", "pricing", "customers", "inventory"],
  },
  { key: "payments", name: "Pagos", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: ["sales"] },
  {
    key: "purchasing",
    name: "Compras",
    version: "1.0.0",
    kind: "BUSINESS_APP",
    dependsOnKeys: ["catalog", "warehouses", "suppliers", "inventory"],
  },
  { key: "pos", name: "Punto de venta", version: "1.0.0", kind: "CHANNEL", dependsOnKeys: ["warehouses", "sales", "payments"] },
  {
    key: "commerce",
    name: "Comercio",
    version: "1.0.0",
    kind: "CHANNEL",
    dependsOnKeys: ["catalog", "warehouses", "customers", "sales", "payments"],
  },
  {
    key: "manufacturing",
    name: "Manufactura",
    version: "1.0.0",
    kind: "BUSINESS_APP",
    dependsOnKeys: ["catalog", "warehouses", "inventory"],
  },
];

export class InvalidAppCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAppCatalogError";
  }
}

/**
 * Fail-fast catalog validation (docs/PLUGINS.md §5), run at boot by
 * AppCatalogSeeder before anything is written to the database — "un
 * catálogo inválido impide el build/deployment; no se descubre el error
 * durante una activación tenant." Scoped to what a code-only, no-manifest-
 * file catalog can actually violate: duplicate keys, a dependency on an
 * unknown key, and dependency cycles (including self-dependency, already
 * rejected by AppDefinition.create). SemVer range compatibility and
 * route/menu/job/event contribution collisions are out of scope for V1
 * mínimo — nothing declares any of those yet (see ADR-005).
 */
export function validateAppCatalog(catalog: readonly AppManifest[]): void {
  const seenKeys = new Set<string>();
  for (const app of catalog) {
    if (seenKeys.has(app.key)) {
      throw new InvalidAppCatalogError(`Duplicate app key in catalog: "${app.key}".`);
    }
    seenKeys.add(app.key);
  }

  for (const app of catalog) {
    for (const dependencyKey of app.dependsOnKeys) {
      if (!seenKeys.has(dependencyKey)) {
        throw new InvalidAppCatalogError(
          `App "${app.key}" depends on unknown app "${dependencyKey}".`,
        );
      }
    }
  }

  const byKey = new Map(catalog.map((app) => [app.key, app]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string, path: string[]): void => {
    if (visited.has(key)) return;
    if (visiting.has(key)) {
      throw new InvalidAppCatalogError(
        `Dependency cycle detected in app catalog: ${[...path, key].join(" -> ")}.`,
      );
    }
    visiting.add(key);
    const app = byKey.get(key);
    for (const dependencyKey of app?.dependsOnKeys ?? []) {
      visit(dependencyKey, [...path, key]);
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const app of catalog) {
    visit(app.key, []);
  }
}
