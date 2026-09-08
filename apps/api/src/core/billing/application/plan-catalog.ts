import { FOUNDATION_APPS } from "../../app-registry";

export interface PlanManifest {
  key: string;
  name: string;
  description: string;
  currency: string;
  basePriceAmount: string;
  perUserPriceAmount: string;
  includesAppKeys: readonly string[];
  isSelfServe: boolean;
}

/**
 * Code-owned commercial plan catalog (docs/DECISIONS.md ADR-016). Seeded
 * idempotently by PlanCatalogSeeder, same pattern as FOUNDATION_APPS/
 * FOUNDATION_PERMISSIONS. Priced in Quetzales (GTQ) — this platform's own
 * target market, per the user's explicit direction. Each plan's
 * `includesAppKeys` is a real, dependency-closed subset of `FOUNDATION_APPS`
 * (verified by `validatePlanCatalog` below against the *actual* app
 * dependency graph, not a hand-maintained duplicate). `Business` and
 * `Enterprise` both resolve to the full 15-app catalog — there is no 16th
 * app to differentiate them with; the honest difference is price and
 * support arrangement, not gated features.
 */
export const FOUNDATION_PLANS: readonly PlanManifest[] = [
  {
    key: "starter",
    name: "Starter",
    description: "Catálogo, inventario y ventas para un solo canal — ideal para empezar a vender de forma ordenada.",
    currency: "GTQ",
    basePriceAmount: "299.0000",
    perUserPriceAmount: "29.0000",
    isSelfServe: true,
    includesAppKeys: [
      "catalog",
      "customers",
      "suppliers",
      "taxes",
      "warehouses",
      "pricing",
      "inventory",
      "sales",
      "payments",
    ],
  },
  {
    key: "profesional",
    name: "Profesional",
    description: "Suma compras, punto de venta, CRM y contabilidad — para operaciones con varios canales y equipos.",
    currency: "GTQ",
    basePriceAmount: "699.0000",
    perUserPriceAmount: "39.0000",
    isSelfServe: true,
    includesAppKeys: [
      "catalog",
      "customers",
      "suppliers",
      "taxes",
      "warehouses",
      "pricing",
      "inventory",
      "sales",
      "payments",
      "purchasing",
      "pos",
      "crm",
      "accounting",
    ],
  },
  {
    key: "business",
    name: "Business",
    description: "Los 15 módulos completos, incluyendo comercio electrónico y manufactura.",
    currency: "GTQ",
    basePriceAmount: "1599.0000",
    perUserPriceAmount: "59.0000",
    isSelfServe: true,
    includesAppKeys: FOUNDATION_APPS.map((app) => app.key),
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "El catálogo completo con acompañamiento comercial dedicado — precio a medida, sin autoservicio.",
    currency: "GTQ",
    basePriceAmount: "0.0000",
    perUserPriceAmount: "0.0000",
    isSelfServe: false,
    includesAppKeys: FOUNDATION_APPS.map((app) => app.key),
  },
];

export class InvalidPlanCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlanCatalogError";
  }
}

/**
 * Fail-fast catalog validation, mirroring `validateAppCatalog`'s own
 * philosophy: an invalid catalog blocks boot, it is never discovered
 * during a real tenant's checkout. Checked against the App Registry's
 * *real* dependency graph — a plan can never list an app without also
 * listing everything that app's own `dependsOnKeys` requires — so this
 * catalog can never silently drift from what `SyncTenantAppsToPlanUseCase`
 * would actually be able to enable.
 */
export function validatePlanCatalog(catalog: readonly PlanManifest[]): void {
  const appDependencies = new Map(FOUNDATION_APPS.map((app) => [app.key, app.dependsOnKeys]));
  const seenKeys = new Set<string>();

  for (const plan of catalog) {
    if (seenKeys.has(plan.key)) {
      throw new InvalidPlanCatalogError(`Duplicate plan key in catalog: "${plan.key}".`);
    }
    seenKeys.add(plan.key);

    const included = new Set(plan.includesAppKeys);
    for (const appKey of plan.includesAppKeys) {
      const dependsOn = appDependencies.get(appKey);
      if (dependsOn === undefined) {
        throw new InvalidPlanCatalogError(`Plan "${plan.key}" includes unknown app "${appKey}".`);
      }
      for (const dependencyKey of dependsOn) {
        if (!included.has(dependencyKey)) {
          throw new InvalidPlanCatalogError(
            `Plan "${plan.key}" includes "${appKey}" but not its required dependency "${dependencyKey}".`,
          );
        }
      }
    }
  }
}
