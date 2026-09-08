import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { newId } from "@erp/database";
import { BillingWebhookEvent } from "../../domain/billing-webhook-event.entity";
import {
  BILLING_WEBHOOK_EVENT_REPOSITORY,
  BillingWebhookEventRepository,
} from "../../domain/billing-webhook-event.repository";
import { TENANT_SUBSCRIPTION_REPOSITORY, TenantSubscriptionRepository } from "../../domain/tenant-subscription.repository";
import { PLAN_REPOSITORY, PlanRepository } from "../../domain/plan.repository";
import { WEBHOOK_VERIFIER, WebhookHeaders, WebhookVerifierPort } from "../ports/webhook-verifier.port";
import { RecurrenteNotConfiguredError } from "../errors";
import { SyncTenantAppsToPlanUseCase } from "./sync-tenant-apps-to-plan.use-case";

export const RECURRENTE_WEBHOOK_SECRET = Symbol("RECURRENTE_WEBHOOK_SECRET");

export interface HandleRecurrenteWebhookInput {
  rawBody: Buffer | string;
  headers: WebhookHeaders;
}

interface SubscriptionWebhookPayload {
  event_type: string;
  id: string;
  customer_id: string;
}

function isSubscriptionWebhookPayload(value: unknown): value is SubscriptionWebhookPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).event_type === "string" &&
    typeof (value as Record<string, unknown>).customer_id === "string"
  );
}

/**
 * The one real inbound webhook receiver in this codebase — every prior
 * integration (SMTP, S3, Recurrente's own outbound checkout/product
 * calls) has been outbound-only. Verifies the Svix signature before any
 * business logic runs (rejecting as `401` if it fails — see the
 * controller), then stores the event under a real unique-constraint
 * idempotency key (docs/DECISIONS.md ADR-016 point 5) before ever acting
 * on it, so a genuine Svix redelivery is a safe no-op.
 *
 * Correlates the payload back to a tenant via `customer_id`
 * (`SubscriptionWebhook`'s real, confirmed field — no `metadata` field
 * exists on that schema to rely on instead), matching the
 * `recurrenteCustomerId` `CreateCheckoutSessionUseCase` already attached
 * before the checkout was ever created. Only `subscription.create`/
 * `.reactivate`/`.unpause` (activate, then sync App Registry access to
 * the tenant's own plan), `subscription.past_due` (status only — ADR-016
 * point 7: no automatic access change), and `subscription.cancel`
 * (cancel, then sync to zero apps) are acted on; every other real event
 * type Recurrente can send is still stored (for idempotency/audit) but
 * deliberately not acted upon yet — a known, logged limitation, never a
 * silently fabricated effect.
 */
@Injectable()
export class HandleRecurrenteWebhookUseCase {
  private readonly logger = new Logger(HandleRecurrenteWebhookUseCase.name);

  constructor(
    @Inject(WEBHOOK_VERIFIER) private readonly verifier: WebhookVerifierPort,
    @Inject(BILLING_WEBHOOK_EVENT_REPOSITORY) private readonly events: BillingWebhookEventRepository,
    @Inject(TENANT_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: TenantSubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    private readonly syncTenantAppsToPlan: SyncTenantAppsToPlanUseCase,
    @Optional() @Inject(RECURRENTE_WEBHOOK_SECRET) private readonly webhookSecret: string | undefined,
  ) {}

  async execute(input: HandleRecurrenteWebhookInput): Promise<void> {
    if (!this.webhookSecret) {
      throw new RecurrenteNotConfiguredError();
    }

    const payload = this.verifier.verify(this.webhookSecret, input.rawBody, input.headers);
    const providerEventId = input.headers["svix-id"];

    const existing = await this.events.findByProviderEventId(providerEventId);
    if (existing) {
      this.logger.log(`Webhook "${providerEventId}" already recorded — replay, skipping side effects.`);
      return;
    }

    const now = new Date();
    const eventType = isSubscriptionWebhookPayload(payload) ? payload.event_type : "unknown";
    const event = BillingWebhookEvent.create({
      id: newId(),
      providerEventId,
      eventType,
      payload,
      processedAt: null,
      createdAt: now,
    });
    await this.events.create(event);

    if (!isSubscriptionWebhookPayload(payload)) {
      this.logger.warn(`Webhook "${providerEventId}" payload shape not recognized — stored, not acted upon.`);
      return;
    }

    await this.dispatch(payload, now);

    event.markProcessed(new Date());
    await this.events.save(event);
  }

  private async dispatch(payload: SubscriptionWebhookPayload, now: Date): Promise<void> {
    switch (payload.event_type) {
      case "subscription.create":
      case "subscription.reactivate":
      case "subscription.unpause":
        await this.activateFromWebhook(payload, now);
        return;
      case "subscription.past_due":
        await this.markPastDueFromWebhook(payload, now);
        return;
      case "subscription.cancel":
        await this.cancelFromWebhook(payload, now);
        return;
      default:
        this.logger.log(`Webhook event type "${payload.event_type}" stored, no automatic action defined for it yet.`);
    }
  }

  private async activateFromWebhook(payload: SubscriptionWebhookPayload, now: Date): Promise<void> {
    const subscription = await this.subscriptions.findByRecurrenteCustomerId(payload.customer_id);
    if (!subscription) {
      this.logger.warn(`No TenantSubscription found for Recurrente customer "${payload.customer_id}" — cannot activate.`);
      return;
    }
    subscription.activate({ recurrenteSubscriptionId: payload.id }, now);
    await this.subscriptions.save(subscription);

    const plan = await this.plans.findById(subscription.planId);
    if (plan) {
      await this.syncTenantAppsToPlan.execute(subscription.tenantId, plan.includesAppKeys);
    }
  }

  private async markPastDueFromWebhook(payload: SubscriptionWebhookPayload, now: Date): Promise<void> {
    const subscription = await this.subscriptions.findByRecurrenteCustomerId(payload.customer_id);
    if (!subscription) {
      this.logger.warn(`No TenantSubscription found for Recurrente customer "${payload.customer_id}" — cannot mark past due.`);
      return;
    }
    subscription.markPastDue(now);
    await this.subscriptions.save(subscription);
  }

  private async cancelFromWebhook(payload: SubscriptionWebhookPayload, now: Date): Promise<void> {
    const subscription = await this.subscriptions.findByRecurrenteCustomerId(payload.customer_id);
    if (!subscription) {
      this.logger.warn(`No TenantSubscription found for Recurrente customer "${payload.customer_id}" — cannot cancel.`);
      return;
    }
    subscription.cancel(now);
    await this.subscriptions.save(subscription);
    await this.syncTenantAppsToPlan.execute(subscription.tenantId, []);
  }
}
