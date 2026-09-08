import { BillingWebhookEvent } from "./billing-webhook-event.entity";

export interface BillingWebhookEventRepository {
  findByProviderEventId(providerEventId: string): Promise<BillingWebhookEvent | null>;
  /** Throws on a real unique-constraint violation of `providerEventId` — callers translate that into "already processed". */
  create(event: BillingWebhookEvent): Promise<void>;
  save(event: BillingWebhookEvent): Promise<void>;
  /**
   * A tenant's own billing activity/movements — every real event whose
   * payload carries this `customer_id`, newest first. The `customer_id`
   * is the one real, confirmed field every `SubscriptionWebhook` payload
   * carries (docs/DECISIONS.md ADR-016) — the same correlation key
   * `HandleRecurrenteWebhookUseCase` already uses to find a tenant.
   */
  listByCustomerId(customerId: string, limit: number): Promise<BillingWebhookEvent[]>;
}

export const BILLING_WEBHOOK_EVENT_REPOSITORY = Symbol("BILLING_WEBHOOK_EVENT_REPOSITORY");
