import { newId } from "@erp/database";
import { BillingWebhookEvent } from "../../domain/billing-webhook-event.entity";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { InMemoryBillingWebhookEventRepository } from "../../test-support/in-memory-billing-webhook-event.repository";
import { InMemoryTenantSubscriptionRepository } from "../../test-support/in-memory-tenant-subscription.repository";
import { ListBillingActivityUseCase } from "./list-billing-activity.use-case";

const TENANT_ID = "tenant-1";
const CUSTOMER_ID = "cust_1";

async function seedSubscription(subscriptions: InMemoryTenantSubscriptionRepository, recurrenteCustomerId: string | null) {
  const now = new Date();
  await subscriptions.save(
    TenantSubscription.create({
      id: newId(),
      tenantId: TENANT_ID,
      planId: "plan-1",
      status: "ACTIVE",
      seatCount: 1,
      recurrenteCustomerId,
      recurrenteSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

describe("ListBillingActivityUseCase", () => {
  it("returns an empty list for a tenant with no subscription yet", async () => {
    const useCase = new ListBillingActivityUseCase(
      new InMemoryTenantSubscriptionRepository(),
      new InMemoryBillingWebhookEventRepository(),
    );
    expect(await useCase.execute(TENANT_ID)).toEqual([]);
  });

  it("returns an empty list for a subscription with no recurrenteCustomerId attached yet (manual assignment)", async () => {
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    await seedSubscription(subscriptions, null);
    const useCase = new ListBillingActivityUseCase(subscriptions, new InMemoryBillingWebhookEventRepository());
    expect(await useCase.execute(TENANT_ID)).toEqual([]);
  });

  it("returns the tenant's own events, newest first, excluding events for other customers", async () => {
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    await seedSubscription(subscriptions, CUSTOMER_ID);
    const events = new InMemoryBillingWebhookEventRepository();

    await events.create(
      BillingWebhookEvent.create({
        id: newId(),
        providerEventId: "evt_1",
        eventType: "subscription.create",
        payload: { customer_id: CUSTOMER_ID },
        processedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
    await events.create(
      BillingWebhookEvent.create({
        id: newId(),
        providerEventId: "evt_2",
        eventType: "subscription.past_due",
        payload: { customer_id: CUSTOMER_ID },
        processedAt: null,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
    );
    await events.create(
      BillingWebhookEvent.create({
        id: newId(),
        providerEventId: "evt_other_tenant",
        eventType: "subscription.create",
        payload: { customer_id: "cust_other" },
        processedAt: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
      }),
    );

    const useCase = new ListBillingActivityUseCase(subscriptions, events);
    const result = await useCase.execute(TENANT_ID);

    expect(result.map((e) => e.eventType)).toEqual(["subscription.past_due", "subscription.create"]);
  });

  it("respects the limit parameter", async () => {
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    await seedSubscription(subscriptions, CUSTOMER_ID);
    const events = new InMemoryBillingWebhookEventRepository();
    for (let i = 0; i < 5; i += 1) {
      await events.create(
        BillingWebhookEvent.create({
          id: newId(),
          providerEventId: `evt_${i}`,
          eventType: "subscription.update",
          payload: { customer_id: CUSTOMER_ID },
          processedAt: null,
          createdAt: new Date(2026, 0, i + 1),
        }),
      );
    }

    const useCase = new ListBillingActivityUseCase(subscriptions, events);
    expect(await useCase.execute(TENANT_ID, 2)).toHaveLength(2);
  });
});
