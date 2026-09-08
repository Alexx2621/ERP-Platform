import { newId } from "@erp/database";
import { AppDefinition } from "../../app-registry/domain/app-definition.entity";
import { InMemoryAppDefinitionRepository } from "../../app-registry/test-support/in-memory-app-definition.repository";
import { InMemoryTenantAppRepository } from "../../app-registry/test-support/in-memory-tenant-app.repository";
import { EnableAppUseCase } from "../../app-registry/application/use-cases/enable-app.use-case";
import { DisableAppUseCase } from "../../app-registry/application/use-cases/disable-app.use-case";
import { ListTenantAppsUseCase } from "../../app-registry/application/use-cases/list-tenant-apps.use-case";
import { InMemoryPlanRepository } from "./in-memory-plan.repository";
import { InMemoryTenantSubscriptionRepository } from "./in-memory-tenant-subscription.repository";
import { InMemoryBillingWebhookEventRepository } from "./in-memory-billing-webhook-event.repository";
import { SyncTenantAppsToPlanUseCase } from "../application/use-cases/sync-tenant-apps-to-plan.use-case";

export const TENANT_ID = "tenant-1";

/**
 * Shared fixture builder for Billing application-layer tests, mirroring
 * the project's established `buildCrmTestContext()`/`buildSalesTestContext()`
 * pattern — real in-memory App Registry use cases (not mocks), seeded
 * with a small fixture app graph (`a`, `b` depending on `a`, `c`
 * standalone) rather than the full 15-app FOUNDATION_APPS, to keep
 * `SyncTenantAppsToPlanUseCase` tests focused on the fixed-point
 * enable/disable logic itself.
 */
export async function buildBillingTestContext() {
  const appDefinitions = new InMemoryAppDefinitionRepository();
  const tenantApps = new InMemoryTenantAppRepository();
  const now = new Date();

  await appDefinitions.upsert(AppDefinition.create({ id: newId(), key: "a", name: "A", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [], createdAt: now, updatedAt: now }));
  await appDefinitions.upsert(AppDefinition.create({ id: newId(), key: "b", name: "B", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: ["a"], createdAt: now, updatedAt: now }));
  await appDefinitions.upsert(AppDefinition.create({ id: newId(), key: "c", name: "C", version: "1.0.0", kind: "BUSINESS_APP", dependsOnKeys: [], createdAt: now, updatedAt: now }));

  const enableApp = new EnableAppUseCase(appDefinitions, tenantApps);
  const disableApp = new DisableAppUseCase(appDefinitions, tenantApps);
  const listTenantApps = new ListTenantAppsUseCase(appDefinitions, tenantApps);
  const syncTenantAppsToPlan = new SyncTenantAppsToPlanUseCase(listTenantApps, enableApp, disableApp);

  const plans = new InMemoryPlanRepository();
  const subscriptions = new InMemoryTenantSubscriptionRepository();
  const webhookEvents = new InMemoryBillingWebhookEventRepository();

  return {
    appDefinitions,
    tenantApps,
    enableApp,
    disableApp,
    listTenantApps,
    syncTenantAppsToPlan,
    plans,
    subscriptions,
    webhookEvents,
  };
}
