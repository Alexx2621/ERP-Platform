import { Inject, Injectable } from "@nestjs/common";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { TENANT_SUBSCRIPTION_REPOSITORY, TenantSubscriptionRepository } from "../../domain/tenant-subscription.repository";

/** Returns null (never throws) for a tenant with no subscription row yet — a real, valid, "hasn't subscribed" state. */
@Injectable()
export class GetTenantSubscriptionUseCase {
  constructor(
    @Inject(TENANT_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: TenantSubscriptionRepository,
  ) {}

  async execute(tenantId: string): Promise<TenantSubscription | null> {
    return this.subscriptions.findByTenantId(tenantId);
  }
}
