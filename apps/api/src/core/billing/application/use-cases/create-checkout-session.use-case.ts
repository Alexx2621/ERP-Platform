import { Inject, Injectable, Optional } from "@nestjs/common";
import { newId } from "@erp/database";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { TENANT_SUBSCRIPTION_REPOSITORY, TenantSubscriptionRepository } from "../../domain/tenant-subscription.repository";
import { PLAN_REPOSITORY, PlanRepository } from "../../domain/plan.repository";
import { RECURRENTE_CLIENT, RecurrenteClient } from "../../infrastructure/recurrente-client";
import { PlanNotFoundError, PlanNotSelfServeError, RecurrenteNotConfiguredError } from "../errors";

export interface CreateCheckoutSessionInput {
  tenantId: string;
  planKey: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
}

/**
 * Creates a real, hosted Recurrente checkout session for a tenant to
 * subscribe or change plan (docs/DECISIONS.md ADR-016 point 8) — never a
 * card-collecting form of our own; the returned URL is Recurrente's own
 * page. Resolves or creates a real Recurrente Customer for the tenant
 * *before* the checkout (ADR-016's Customer-first correlation strategy —
 * `SubscriptionWebhook` payloads carry `customer_id`, not a caller-chosen
 * metadata field, so this is what lets `HandleRecurrenteWebhookUseCase`
 * later match an incoming webhook back to the right tenant). The resulting
 * `TenantSubscription` row is written as `PENDING` immediately — it only
 * becomes `ACTIVE` once a real `subscription.create` webhook confirms the
 * first charge, never optimistically here.
 */
@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(TENANT_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: TenantSubscriptionRepository,
    @Optional() @Inject(RECURRENTE_CLIENT) private readonly recurrente: RecurrenteClient | undefined,
  ) {}

  async execute(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
    const plan = await this.plans.findByKey(input.planKey);
    if (!plan) {
      throw new PlanNotFoundError(input.planKey);
    }
    if (!plan.isSelfServe) {
      throw new PlanNotSelfServeError(input.planKey);
    }
    if (!this.recurrente || !plan.recurrentePriceId) {
      throw new RecurrenteNotConfiguredError();
    }

    const now = new Date();
    let subscription = await this.subscriptions.findByTenantId(input.tenantId);
    if (!subscription) {
      subscription = TenantSubscription.create({
        id: newId(),
        tenantId: input.tenantId,
        planId: plan.id,
        status: "PENDING",
        seatCount: 1,
        recurrenteCustomerId: null,
        recurrenteSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    let customerId = subscription.recurrenteCustomerId;
    if (!customerId) {
      const created = await this.recurrente.createCustomer({ email: input.customerEmail, name: input.customerName });
      customerId = created.customerId;
      subscription.attachRecurrenteCustomer(customerId, now);
    }
    subscription.assignPlan(plan.id, now);
    await this.subscriptions.save(subscription);

    const checkout = await this.recurrente.createCheckout({
      priceId: plan.recurrentePriceId,
      customerId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return { checkoutUrl: checkout.checkoutUrl };
  }
}
