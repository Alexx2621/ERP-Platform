import { BillingWebhookEvent } from "./billing-webhook-event.entity";

export interface BillingWebhookEventRepository {
  findByProviderEventId(providerEventId: string): Promise<BillingWebhookEvent | null>;
  /** Throws on a real unique-constraint violation of `providerEventId` — callers translate that into "already processed". */
  create(event: BillingWebhookEvent): Promise<void>;
  save(event: BillingWebhookEvent): Promise<void>;
}

export const BILLING_WEBHOOK_EVENT_REPOSITORY = Symbol("BILLING_WEBHOOK_EVENT_REPOSITORY");
