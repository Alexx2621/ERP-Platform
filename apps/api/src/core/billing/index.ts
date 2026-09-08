/** Public contract of the Billing module. Other modules must only import from here. */
export { Plan, type PlanProps } from "./domain/plan.entity";
export { PLAN_REPOSITORY, type PlanRepository } from "./domain/plan.repository";
export {
  TenantSubscription,
  type TenantSubscriptionProps,
  type TenantSubscriptionStatus,
} from "./domain/tenant-subscription.entity";
export { FOUNDATION_PLANS, type PlanManifest, validatePlanCatalog, InvalidPlanCatalogError } from "./application/plan-catalog";
export { ListPlansUseCase } from "./application/use-cases/list-plans.use-case";
export { GetTenantSubscriptionUseCase } from "./application/use-cases/get-tenant-subscription.use-case";
export {
  AssignTenantPlanUseCase,
  type AssignTenantPlanInput,
} from "./application/use-cases/assign-tenant-plan.use-case";
export { SyncTenantAppsToPlanUseCase } from "./application/use-cases/sync-tenant-apps-to-plan.use-case";
export { PlanCatalogSeeder } from "./application/plan-catalog-seeder";
export {
  PlanNotFoundError,
  PlanNotSelfServeError,
  TenantSubscriptionNotFoundError,
  TenantSubscriptionConflictError,
  RecurrenteApiError,
  RecurrenteNotConfiguredError,
  InvalidWebhookSignatureError,
  WebhookAlreadyProcessedError,
} from "./application/errors";
export { handleBillingError } from "./presentation/billing-error.mapper";
export { PlanResponseDto } from "./presentation/dto/plan-response.dto";
export { TenantSubscriptionResponseDto } from "./presentation/dto/tenant-subscription-response.dto";
export { AssignTenantPlanDto } from "./presentation/dto/assign-tenant-plan.dto";
export { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
export { HandleRecurrenteWebhookUseCase } from "./application/use-cases/handle-recurrente-webhook.use-case";
export { BillingPlansController } from "./presentation/billing-plans.controller";
export { BillingController } from "./presentation/billing.controller";
export { BillingWebhooksController } from "./presentation/billing-webhooks.controller";
export { BillingModule } from "./billing.module";
