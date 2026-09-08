import { BillingWebhookEvent } from "../domain/billing-webhook-event.entity";
import { BillingWebhookEventRepository } from "../domain/billing-webhook-event.repository";
import { WebhookAlreadyProcessedError } from "../application/errors";

export class InMemoryBillingWebhookEventRepository implements BillingWebhookEventRepository {
  private readonly byId = new Map<string, BillingWebhookEvent>();

  async findByProviderEventId(providerEventId: string): Promise<BillingWebhookEvent | null> {
    return [...this.byId.values()].find((e) => e.providerEventId === providerEventId) ?? null;
  }

  async create(event: BillingWebhookEvent): Promise<void> {
    const existing = await this.findByProviderEventId(event.providerEventId);
    if (existing) {
      throw new WebhookAlreadyProcessedError(event.providerEventId);
    }
    this.byId.set(event.id, event);
  }

  async save(event: BillingWebhookEvent): Promise<void> {
    this.byId.set(event.id, event);
  }
}
