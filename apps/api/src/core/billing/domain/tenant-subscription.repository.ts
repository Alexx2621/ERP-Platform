import { TenantSubscription } from "./tenant-subscription.entity";

export interface TenantSubscriptionRepository {
  findByTenantId(tenantId: string): Promise<TenantSubscription | null>;
  /** Correlates an incoming webhook back to a tenant — see ADR-016's Customer-first correlation strategy. */
  findByRecurrenteCustomerId(recurrenteCustomerId: string): Promise<TenantSubscription | null>;
  findByRecurrenteSubscriptionId(recurrenteSubscriptionId: string): Promise<TenantSubscription | null>;
  /** Upsert-by-tenantId — one row per tenant (`@@unique tenantId`). */
  save(subscription: TenantSubscription): Promise<void>;
}

export const TENANT_SUBSCRIPTION_REPOSITORY = Symbol("TENANT_SUBSCRIPTION_REPOSITORY");
