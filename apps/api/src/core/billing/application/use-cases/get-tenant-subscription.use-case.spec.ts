import { newId } from "@erp/database";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { InMemoryTenantSubscriptionRepository } from "../../test-support/in-memory-tenant-subscription.repository";
import { GetTenantSubscriptionUseCase } from "./get-tenant-subscription.use-case";

describe("GetTenantSubscriptionUseCase", () => {
  it("returns null (never throws) for a tenant that never subscribed", async () => {
    const useCase = new GetTenantSubscriptionUseCase(new InMemoryTenantSubscriptionRepository());
    expect(await useCase.execute("tenant-1")).toBeNull();
  });

  it("returns the tenant's real subscription when it has one", async () => {
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    const now = new Date();
    await subscriptions.save(
      TenantSubscription.create({ id: newId(), tenantId: "tenant-1", planId: "plan-1", status: "ACTIVE", seatCount: 1, recurrenteCustomerId: null, recurrenteSubscriptionId: null, currentPeriodStart: null, currentPeriodEnd: null, cancelledAt: null, createdAt: now, updatedAt: now }),
    );
    const useCase = new GetTenantSubscriptionUseCase(subscriptions);
    expect((await useCase.execute("tenant-1"))?.status).toBe("ACTIVE");
  });
});
