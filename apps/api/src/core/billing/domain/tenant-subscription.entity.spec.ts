import { TenantSubscription, TenantSubscriptionProps } from "./tenant-subscription.entity";

function baseProps(overrides: Partial<TenantSubscriptionProps> = {}): TenantSubscriptionProps {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "sub-1",
    tenantId: "tenant-1",
    planId: "plan-1",
    status: "PENDING",
    seatCount: 1,
    recurrenteCustomerId: null,
    recurrenteSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("TenantSubscription", () => {
  it("creates a valid PENDING subscription", () => {
    const subscription = TenantSubscription.create(baseProps());
    expect(subscription.status).toBe("PENDING");
  });

  it("rejects a seatCount below 1", () => {
    expect(() => TenantSubscription.create(baseProps({ seatCount: 0 }))).toThrow();
  });

  it("rejects a CANCELLED subscription with no cancelledAt", () => {
    expect(() => TenantSubscription.create(baseProps({ status: "CANCELLED", cancelledAt: null }))).toThrow();
  });

  it("attachRecurrenteCustomer sets the id and touches updatedAt", () => {
    const subscription = TenantSubscription.create(baseProps());
    const now = new Date("2026-02-01T00:00:00.000Z");
    subscription.attachRecurrenteCustomer("cust_1", now);
    expect(subscription.recurrenteCustomerId).toBe("cust_1");
    expect(subscription.updatedAt).toEqual(now);
  });

  it("activate sets status ACTIVE, clears cancelledAt, and can attach recurrenteSubscriptionId", () => {
    const subscription = TenantSubscription.create(
      baseProps({ status: "CANCELLED", cancelledAt: new Date("2026-01-15T00:00:00.000Z") }),
    );
    const now = new Date("2026-02-01T00:00:00.000Z");
    subscription.activate({ recurrenteSubscriptionId: "rsub_1" }, now);
    expect(subscription.status).toBe("ACTIVE");
    expect(subscription.recurrenteSubscriptionId).toBe("rsub_1");
    expect(subscription.cancelledAt).toBeNull();
  });

  it("activate without a recurrenteSubscriptionId leaves the existing one untouched", () => {
    const subscription = TenantSubscription.create(baseProps({ recurrenteSubscriptionId: "rsub_existing" }));
    subscription.activate({}, new Date());
    expect(subscription.recurrenteSubscriptionId).toBe("rsub_existing");
  });

  it("markPastDue only changes status, never period/cancellation fields", () => {
    const subscription = TenantSubscription.create(
      baseProps({ status: "ACTIVE", currentPeriodStart: new Date("2026-01-01T00:00:00.000Z") }),
    );
    subscription.markPastDue(new Date("2026-02-01T00:00:00.000Z"));
    expect(subscription.status).toBe("PAST_DUE");
    expect(subscription.currentPeriodStart).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(subscription.cancelledAt).toBeNull();
  });

  it("cancel sets status CANCELLED and cancelledAt", () => {
    const subscription = TenantSubscription.create(baseProps({ status: "ACTIVE" }));
    const now = new Date("2026-03-01T00:00:00.000Z");
    subscription.cancel(now);
    expect(subscription.status).toBe("CANCELLED");
    expect(subscription.cancelledAt).toEqual(now);
  });

  it("assignPlan changes planId and touches updatedAt", () => {
    const subscription = TenantSubscription.create(baseProps());
    const now = new Date("2026-04-01T00:00:00.000Z");
    subscription.assignPlan("plan-2", now);
    expect(subscription.planId).toBe("plan-2");
    expect(subscription.updatedAt).toEqual(now);
  });

  it("assignPlan drops an ACTIVE subscription back to PENDING when it genuinely changes plan", () => {
    const subscription = TenantSubscription.create(baseProps({ status: "ACTIVE", planId: "plan-1" }));
    subscription.assignPlan("plan-2", new Date());
    expect(subscription.status).toBe("PENDING");
  });

  it("assignPlan never resets status when reassigning the same plan it already has", () => {
    const subscription = TenantSubscription.create(baseProps({ status: "ACTIVE", planId: "plan-1" }));
    subscription.assignPlan("plan-1", new Date());
    expect(subscription.status).toBe("ACTIVE");
  });
});
