import { Inject, Injectable } from "@nestjs/common";
import { BillingWebhookEvent } from "../../domain/billing-webhook-event.entity";
import {
  BILLING_WEBHOOK_EVENT_REPOSITORY,
  BillingWebhookEventRepository,
} from "../../domain/billing-webhook-event.repository";
import { TENANT_SUBSCRIPTION_REPOSITORY, TenantSubscriptionRepository } from "../../domain/tenant-subscription.repository";

const DEFAULT_LIMIT = 50;

/**
 * A tenant's own billing activity/movements — real Recurrente webhook
 * events correlated to the tenant via its own `recurrenteCustomerId`
 * (docs/DECISIONS.md ADR-016), the same correlation key
 * `HandleRecurrenteWebhookUseCase` already uses. A tenant with no
 * subscription yet (no `recurrenteCustomerId` recorded) simply has no
 * activity — an empty list, never an error.
 */
@Injectable()
export class ListBillingActivityUseCase {
  constructor(
    @Inject(TENANT_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: TenantSubscriptionRepository,
    @Inject(BILLING_WEBHOOK_EVENT_REPOSITORY) private readonly events: BillingWebhookEventRepository,
  ) {}

  async execute(tenantId: string, limit: number = DEFAULT_LIMIT): Promise<BillingWebhookEvent[]> {
    const subscription = await this.subscriptions.findByTenantId(tenantId);
    if (!subscription?.recurrenteCustomerId) {
      return [];
    }
    return this.events.listByCustomerId(subscription.recurrenteCustomerId, limit);
  }
}
