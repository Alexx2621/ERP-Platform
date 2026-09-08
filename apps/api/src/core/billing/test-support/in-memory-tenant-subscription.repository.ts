import { TenantSubscription } from "../domain/tenant-subscription.entity";
import { TenantSubscriptionRepository } from "../domain/tenant-subscription.repository";
import { TenantSubscriptionConflictError } from "../application/errors";

export class InMemoryTenantSubscriptionRepository implements TenantSubscriptionRepository {
  private readonly byId = new Map<string, TenantSubscription>();

  async findByTenantId(tenantId: string): Promise<TenantSubscription | null> {
    return [...this.byId.values()].find((s) => s.tenantId === tenantId) ?? null;
  }

  async findByRecurrenteCustomerId(recurrenteCustomerId: string): Promise<TenantSubscription | null> {
    return [...this.byId.values()].find((s) => s.recurrenteCustomerId === recurrenteCustomerId) ?? null;
  }

  async findByRecurrenteSubscriptionId(recurrenteSubscriptionId: string): Promise<TenantSubscription | null> {
    return [...this.byId.values()].find((s) => s.recurrenteSubscriptionId === recurrenteSubscriptionId) ?? null;
  }

  async save(subscription: TenantSubscription): Promise<void> {
    if (!this.byId.has(subscription.id)) {
      const existing = await this.findByTenantId(subscription.tenantId);
      if (existing) {
        throw new TenantSubscriptionConflictError();
      }
    }
    this.byId.set(subscription.id, subscription);
  }
}
