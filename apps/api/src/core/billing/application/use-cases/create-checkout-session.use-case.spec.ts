import { newId } from "@erp/database";
import { Plan } from "../../domain/plan.entity";
import { InMemoryPlanRepository } from "../../test-support/in-memory-plan.repository";
import { InMemoryTenantSubscriptionRepository } from "../../test-support/in-memory-tenant-subscription.repository";
import { PlanNotFoundError, PlanNotSelfServeError, RecurrenteNotConfiguredError } from "../errors";
import { CreateCheckoutSessionUseCase } from "./create-checkout-session.use-case";
import type { RecurrenteClient } from "../../infrastructure/recurrente-client";

function selfServePlan(overrides: Partial<Parameters<typeof Plan.create>[0]> = {}) {
  const now = new Date();
  return Plan.create({
    id: newId(),
    key: "starter",
    name: "Starter",
    description: "d",
    currency: "GTQ",
    basePriceAmount: "299.0000",
    perUserPriceAmount: "29.0000",
    includesAppKeys: [],
    isSelfServe: true,
    recurrenteProductId: "prod_1",
    recurrentePriceId: "price_1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function fakeRecurrenteClient(overrides: Partial<RecurrenteClient> = {}): RecurrenteClient {
  return {
    createCustomer: jest.fn().mockResolvedValue({ customerId: "cust_1" }),
    createCheckout: jest.fn().mockResolvedValue({ checkoutId: "chk_1", checkoutUrl: "https://app.recurrente.com/checkout/chk_1" }),
    createRecurringProduct: jest.fn(),
    ...overrides,
  } as unknown as RecurrenteClient;
}

describe("CreateCheckoutSessionUseCase", () => {
  it("creates a Recurrente customer, saves a PENDING subscription, and returns the checkout URL", async () => {
    const plans = new InMemoryPlanRepository();
    const plan = selfServePlan();
    await plans.upsert(plan);
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    const recurrente = fakeRecurrenteClient();

    const useCase = new CreateCheckoutSessionUseCase(plans, subscriptions, recurrente);
    const result = await useCase.execute({
      tenantId: "tenant-1",
      planKey: "starter",
      customerEmail: "owner@example.com",
      customerName: "Owner",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
    });

    expect(result.checkoutUrl).toBe("https://app.recurrente.com/checkout/chk_1");
    expect(recurrente.createCustomer).toHaveBeenCalledWith({ email: "owner@example.com", name: "Owner" });

    const subscription = await subscriptions.findByTenantId("tenant-1");
    expect(subscription?.status).toBe("PENDING");
    expect(subscription?.recurrenteCustomerId).toBe("cust_1");
    expect(subscription?.planId).toBe(plan.id);
  });

  it("reuses an already-attached Recurrente customer instead of creating a new one", async () => {
    const plans = new InMemoryPlanRepository();
    await plans.upsert(selfServePlan());
    const subscriptions = new InMemoryTenantSubscriptionRepository();
    const recurrente = fakeRecurrenteClient();
    const useCase = new CreateCheckoutSessionUseCase(plans, subscriptions, recurrente);

    // First call creates the customer.
    await useCase.execute({
      tenantId: "tenant-1",
      planKey: "starter",
      customerEmail: "owner@example.com",
      customerName: "Owner",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
    });
    // Second call (e.g. changing plan) must not create a second customer.
    await useCase.execute({
      tenantId: "tenant-1",
      planKey: "starter",
      customerEmail: "owner@example.com",
      customerName: "Owner",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
    });

    expect(recurrente.createCustomer).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown plan key", async () => {
    const plans = new InMemoryPlanRepository();
    const useCase = new CreateCheckoutSessionUseCase(plans, new InMemoryTenantSubscriptionRepository(), fakeRecurrenteClient());
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        planKey: "nonexistent",
        customerEmail: "a@b.com",
        customerName: "A",
        successUrl: "https://x",
        cancelUrl: "https://y",
      }),
    ).rejects.toThrow(PlanNotFoundError);
  });

  it("rejects checking out a non-self-serve plan (Enterprise)", async () => {
    const plans = new InMemoryPlanRepository();
    await plans.upsert(selfServePlan({ key: "enterprise", isSelfServe: false }));
    const useCase = new CreateCheckoutSessionUseCase(plans, new InMemoryTenantSubscriptionRepository(), fakeRecurrenteClient());
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        planKey: "enterprise",
        customerEmail: "a@b.com",
        customerName: "A",
        successUrl: "https://x",
        cancelUrl: "https://y",
      }),
    ).rejects.toThrow(PlanNotSelfServeError);
  });

  it("fails closed with RecurrenteNotConfiguredError when no RecurrenteClient is injected", async () => {
    const plans = new InMemoryPlanRepository();
    await plans.upsert(selfServePlan());
    const useCase = new CreateCheckoutSessionUseCase(plans, new InMemoryTenantSubscriptionRepository(), undefined);
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        planKey: "starter",
        customerEmail: "a@b.com",
        customerName: "A",
        successUrl: "https://x",
        cancelUrl: "https://y",
      }),
    ).rejects.toThrow(RecurrenteNotConfiguredError);
  });

  it("fails closed when the plan has no recurrentePriceId yet (seeded before Recurrente was configured)", async () => {
    const plans = new InMemoryPlanRepository();
    await plans.upsert(selfServePlan({ recurrenteProductId: null, recurrentePriceId: null }));
    const useCase = new CreateCheckoutSessionUseCase(plans, new InMemoryTenantSubscriptionRepository(), fakeRecurrenteClient());
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        planKey: "starter",
        customerEmail: "a@b.com",
        customerName: "A",
        successUrl: "https://x",
        cancelUrl: "https://y",
      }),
    ).rejects.toThrow(RecurrenteNotConfiguredError);
  });
});
