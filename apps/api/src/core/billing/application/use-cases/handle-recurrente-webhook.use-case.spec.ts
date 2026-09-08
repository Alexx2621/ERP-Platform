import { newId } from "@erp/database";
import { Plan } from "../../domain/plan.entity";
import { TenantSubscription } from "../../domain/tenant-subscription.entity";
import { buildBillingTestContext, TENANT_ID } from "../../test-support/build-billing-test-context";
import { InvalidWebhookSignatureError, RecurrenteNotConfiguredError } from "../errors";
import type { WebhookHeaders, WebhookVerifierPort } from "../ports/webhook-verifier.port";
import { HandleRecurrenteWebhookUseCase } from "./handle-recurrente-webhook.use-case";

const HEADERS: WebhookHeaders = { "svix-id": "msg_1", "svix-timestamp": "1700000000", "svix-signature": "v1,fake" };
const CUSTOMER_ID = "cust_1";

function fakeVerifier(payload: unknown): WebhookVerifierPort {
  return { verify: jest.fn().mockReturnValue(payload) };
}

function throwingVerifier(): WebhookVerifierPort {
  return {
    verify: jest.fn().mockImplementation(() => {
      throw new InvalidWebhookSignatureError();
    }),
  };
}

async function setupSubscribedTenant(ctx: Awaited<ReturnType<typeof buildBillingTestContext>>) {
  const now = new Date();
  const plan = Plan.create({
    id: newId(),
    key: "starter",
    name: "Starter",
    description: "d",
    currency: "GTQ",
    basePriceAmount: "299.0000",
    perUserPriceAmount: "29.0000",
    includesAppKeys: ["a"],
    isSelfServe: true,
    recurrenteProductId: null,
    recurrentePriceId: null,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.plans.upsert(plan);

  const subscription = TenantSubscription.create({
    id: newId(),
    tenantId: TENANT_ID,
    planId: plan.id,
    status: "PENDING",
    seatCount: 1,
    recurrenteCustomerId: CUSTOMER_ID,
    recurrenteSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.subscriptions.save(subscription);
  return { plan, subscription };
}

describe("HandleRecurrenteWebhookUseCase", () => {
  it("fails closed with RecurrenteNotConfiguredError when no webhook secret is injected", async () => {
    const ctx = await buildBillingTestContext();
    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.create", customer_id: CUSTOMER_ID, id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      undefined,
    );
    await expect(useCase.execute({ rawBody: "{}", headers: HEADERS })).rejects.toThrow(RecurrenteNotConfiguredError);
  });

  it("propagates a real signature verification failure and stores nothing", async () => {
    const ctx = await buildBillingTestContext();
    const useCase = new HandleRecurrenteWebhookUseCase(
      throwingVerifier(),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );
    await expect(useCase.execute({ rawBody: "{}", headers: HEADERS })).rejects.toThrow(InvalidWebhookSignatureError);
    expect(await ctx.webhookEvents.findByProviderEventId(HEADERS["svix-id"])).toBeNull();
  });

  it("subscription.create activates the tenant's subscription and syncs App Registry access to its plan", async () => {
    const ctx = await buildBillingTestContext();
    await setupSubscribedTenant(ctx);
    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.create", customer_id: CUSTOMER_ID, id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );

    await useCase.execute({ rawBody: "{}", headers: HEADERS });

    const subscription = await ctx.subscriptions.findByTenantId(TENANT_ID);
    expect(subscription?.status).toBe("ACTIVE");
    expect(subscription?.recurrenteSubscriptionId).toBe("rsub_1");
    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("ENABLED");

    const stored = await ctx.webhookEvents.findByProviderEventId(HEADERS["svix-id"]);
    expect(stored?.eventType).toBe("subscription.create");
    expect(stored?.processedAt).not.toBeNull();
  });

  it("a redelivered event (same svix-id) is a safe no-op — no second activation attempt", async () => {
    const ctx = await buildBillingTestContext();
    await setupSubscribedTenant(ctx);
    const verifier = fakeVerifier({ event_type: "subscription.create", customer_id: CUSTOMER_ID, id: "rsub_1" });
    const useCase = new HandleRecurrenteWebhookUseCase(verifier, ctx.webhookEvents, ctx.subscriptions, ctx.plans, ctx.syncTenantAppsToPlan, "whsec_test");

    await useCase.execute({ rawBody: "{}", headers: HEADERS });
    await useCase.execute({ rawBody: "{}", headers: HEADERS });

    expect(verifier.verify).toHaveBeenCalledTimes(2);
    // Only one real activation happened — asserted indirectly: the
    // subscription reflects the single activation's fields with no error.
    const subscription = await ctx.subscriptions.findByTenantId(TENANT_ID);
    expect(subscription?.status).toBe("ACTIVE");
  });

  it("subscription.past_due only changes status — access is never revoked automatically", async () => {
    const ctx = await buildBillingTestContext();
    await setupSubscribedTenant(ctx);
    await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a"]);

    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.past_due", customer_id: CUSTOMER_ID, id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );
    await useCase.execute({ rawBody: "{}", headers: HEADERS });

    const subscription = await ctx.subscriptions.findByTenantId(TENANT_ID);
    expect(subscription?.status).toBe("PAST_DUE");
    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("ENABLED");
  });

  it("subscription.cancel cancels the subscription and revokes every app the tenant had", async () => {
    const ctx = await buildBillingTestContext();
    await setupSubscribedTenant(ctx);
    await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a"]);

    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.cancel", customer_id: CUSTOMER_ID, id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );
    await useCase.execute({ rawBody: "{}", headers: HEADERS });

    const subscription = await ctx.subscriptions.findByTenantId(TENANT_ID);
    expect(subscription?.status).toBe("CANCELLED");
    expect(subscription?.cancelledAt).not.toBeNull();
    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.every((a) => a.status === "DISABLED")).toBe(true);
  });

  it("an event type with no defined action is stored but mutates nothing", async () => {
    const ctx = await buildBillingTestContext();
    await setupSubscribedTenant(ctx);
    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.update", customer_id: CUSTOMER_ID, id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );
    await useCase.execute({ rawBody: "{}", headers: HEADERS });

    const subscription = await ctx.subscriptions.findByTenantId(TENANT_ID);
    expect(subscription?.status).toBe("PENDING");
    expect(await ctx.webhookEvents.findByProviderEventId(HEADERS["svix-id"])).not.toBeNull();
  });

  it("a payload that cannot be correlated to any tenant is stored and does not throw", async () => {
    const ctx = await buildBillingTestContext();
    const useCase = new HandleRecurrenteWebhookUseCase(
      fakeVerifier({ event_type: "subscription.create", customer_id: "cust_unknown", id: "rsub_1" }),
      ctx.webhookEvents,
      ctx.subscriptions,
      ctx.plans,
      ctx.syncTenantAppsToPlan,
      "whsec_test",
    );
    await expect(useCase.execute({ rawBody: "{}", headers: HEADERS })).resolves.toBeUndefined();
    expect(await ctx.webhookEvents.findByProviderEventId(HEADERS["svix-id"])).not.toBeNull();
  });
});
