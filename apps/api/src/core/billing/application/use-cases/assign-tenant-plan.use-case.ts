import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { TENANT_SUBSCRIPTION_REPOSITORY, TenantSubscriptionRepository } from "../../domain/tenant-subscription.repository";
import { PLAN_REPOSITORY, PlanRepository } from "../../domain/plan.repository";
import { PlanNotFoundError } from "../errors";
import { SyncTenantAppsToPlanUseCase } from "./sync-tenant-apps-to-plan.use-case";

export interface AssignTenantPlanInput {
  tenantId: string;
  planKey: string;
}

/**
 * A Platform Admin manually assigns/changes a tenant's plan — comping an
 * account, a sales-negotiated `Enterprise` arrangement, or fixing a
 * subscription state by hand (docs/DECISIONS.md ADR-016's own documented
 * gap: no tenant-facing self-service billing portal in V1, only this
 * admin path plus the real self-serve checkout). No Recurrente call is
 * made here at all — this activates the tenant's own App Registry access
 * directly, independent of any real charge, exactly the same
 * `SyncTenantAppsToPlanUseCase` a real `subscription.create` webhook
 * would also trigger.
 */
@Injectable()
export class AssignTenantPlanUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(TENANT_SUBSCRIPTION_REPOSITORY) private readonly subscriptions: TenantSubscriptionRepository,
    private readonly syncTenantAppsToPlan: SyncTenantAppsToPlanUseCase,
  ) {}

  async execute(input: AssignTenantPlanInput): Promise<TenantSubscription> {
    const plan = await this.plans.findByKey(input.planKey);
    if (!plan) {
      throw new PlanNotFoundError(input.planKey);
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

    subscription.assignPlan(plan.id, now);
    subscription.activate({}, now);
    await this.subscriptions.save(subscription);

    await this.syncTenantAppsToPlan.execute(input.tenantId, plan.includesAppKeys);

    return subscription;
  }
}
