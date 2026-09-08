import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth";
import { TenantsModule } from "../tenants";
import { AccessControlModule } from "../access-control";
import { AuditModule } from "../audit";
import { AppRegistryModule } from "../app-registry";
import type { EnvironmentVariables } from "../../shared/config/environment-variables";
import { PLAN_REPOSITORY } from "./domain/plan.repository";
import { TENANT_SUBSCRIPTION_REPOSITORY } from "./domain/tenant-subscription.repository";
import { BILLING_WEBHOOK_EVENT_REPOSITORY } from "./domain/billing-webhook-event.repository";
import { PrismaPlanRepository } from "./infrastructure/prisma-plan.repository";
import { PrismaTenantSubscriptionRepository } from "./infrastructure/prisma-tenant-subscription.repository";
import { PrismaBillingWebhookEventRepository } from "./infrastructure/prisma-billing-webhook-event.repository";
import { RECURRENTE_CLIENT, RecurrenteClient } from "./infrastructure/recurrente-client";
import { SvixWebhookVerifier } from "./infrastructure/svix-webhook-verifier";
import { WEBHOOK_VERIFIER } from "./application/ports/webhook-verifier.port";
import { PlanCatalogSeeder } from "./application/plan-catalog-seeder";
import { ListPlansUseCase } from "./application/use-cases/list-plans.use-case";
import { GetTenantSubscriptionUseCase } from "./application/use-cases/get-tenant-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { AssignTenantPlanUseCase } from "./application/use-cases/assign-tenant-plan.use-case";
import { SyncTenantAppsToPlanUseCase } from "./application/use-cases/sync-tenant-apps-to-plan.use-case";
import { HandleRecurrenteWebhookUseCase, RECURRENTE_WEBHOOK_SECRET } from "./application/use-cases/handle-recurrente-webhook.use-case";
import { BillingPlansController } from "./presentation/billing-plans.controller";
import { BillingController } from "./presentation/billing.controller";
import { BillingWebhooksController } from "./presentation/billing-webhooks.controller";

/**
 * The platform-scoped commercial-billing context (docs/DECISIONS.md
 * ADR-016) — the exact mirror of `AppRegistryModule`, but for what a
 * tenant is *entitled to* (paying for) rather than what it is
 * *technically allowed* to use. Imports `AppRegistryModule` directly
 * (`SyncTenantAppsToPlanUseCase` reuses `EnableAppUseCase`/
 * `DisableAppUseCase`/`ListTenantAppsUseCase` exactly as built, and
 * `plan-catalog.ts` validates against the real `FOUNDATION_APPS` graph) —
 * a one-way edge with no cycle, since `AppRegistryModule` stays a leaf
 * and never imports this module back.
 *
 * `RECURRENTE_CLIENT`/`RECURRENTE_WEBHOOK_SECRET` are provided as
 * `undefined` when their env vars are unset (CI, most local dev, tests),
 * the same "fail closed with an explanatory log line, never silently
 * fake success" pattern already established by `EmailModule`.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, AppRegistryModule],
  controllers: [BillingPlansController, BillingController, BillingWebhooksController],
  providers: [
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
    { provide: TENANT_SUBSCRIPTION_REPOSITORY, useClass: PrismaTenantSubscriptionRepository },
    { provide: BILLING_WEBHOOK_EVENT_REPOSITORY, useClass: PrismaBillingWebhookEventRepository },
    { provide: WEBHOOK_VERIFIER, useClass: SvixWebhookVerifier },
    {
      provide: RECURRENTE_CLIENT,
      useFactory: (config: ConfigService<EnvironmentVariables, true>): RecurrenteClient | undefined => {
        const secretKey = config.get("RECURRENTE_SECRET_KEY", { infer: true });
        return secretKey ? new RecurrenteClient(secretKey) : undefined;
      },
      inject: [ConfigService],
    },
    {
      provide: RECURRENTE_WEBHOOK_SECRET,
      useFactory: (config: ConfigService<EnvironmentVariables, true>): string | undefined =>
        config.get("RECURRENTE_WEBHOOK_SECRET", { infer: true }) || undefined,
      inject: [ConfigService],
    },
    PlanCatalogSeeder,
    ListPlansUseCase,
    GetTenantSubscriptionUseCase,
    CreateCheckoutSessionUseCase,
    AssignTenantPlanUseCase,
    SyncTenantAppsToPlanUseCase,
    HandleRecurrenteWebhookUseCase,
  ],
  exports: [
    PLAN_REPOSITORY,
    TENANT_SUBSCRIPTION_REPOSITORY,
    ListPlansUseCase,
    GetTenantSubscriptionUseCase,
    AssignTenantPlanUseCase,
    SyncTenantAppsToPlanUseCase,
    PlanCatalogSeeder,
  ],
})
export class BillingModule {}
