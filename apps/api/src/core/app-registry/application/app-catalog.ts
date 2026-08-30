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
 * FOUNDATION_PERMISSIONS/setting-catalog.ts. Deliberately empty: no
 * business module beyond the Platform Core exists yet to register here
 * (docs/WORK_QUEUE.md), and Core capabilities themselves are never
 * app-registrable (docs/ARCHITECTURE.md §5.3-§5.4) — always-on for every
 * tenant, not optional. The mechanism below is fully built and tested
 * against fixture manifests so the first real business app (Phase 2+) only
 * needs to add an entry here, not build any new infrastructure.
 */
export const FOUNDATION_APPS: readonly AppManifest[] = [];

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
