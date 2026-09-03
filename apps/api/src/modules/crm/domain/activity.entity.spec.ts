import { Activity, ActivityProps } from "./activity.entity";

function props(overrides: Partial<ActivityProps> = {}): ActivityProps {
  const now = new Date();
  return {
    id: "activity-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    type: "CALL",
    subject: "Intro call",
    notes: null,
    relatedLeadId: "lead-1",
    relatedOpportunityId: null,
    relatedCustomerId: null,
    ownerId: "user-1",
    dueAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Activity", () => {
  it("rejects an empty subject", () => {
    expect(() => Activity.create(props({ subject: " " }))).toThrow();
  });

  it("accepts a lead-related activity", () => {
    const activity = Activity.create(props());
    expect(activity.relatedLeadId).toBe("lead-1");
  });

  it("accepts an opportunity-related activity", () => {
    const activity = Activity.create(props({ relatedLeadId: null, relatedOpportunityId: "opp-1" }));
    expect(activity.relatedOpportunityId).toBe("opp-1");
  });

  it("accepts a customer-related activity", () => {
    const activity = Activity.create(props({ relatedLeadId: null, relatedCustomerId: "customer-1" }));
    expect(activity.relatedCustomerId).toBe("customer-1");
  });

  it("rejects an activity with none of lead/opportunity/customer set", () => {
    expect(() => Activity.create(props({ relatedLeadId: null }))).toThrow(/exactly one/);
  });

  it("rejects an activity with more than one of lead/opportunity/customer set", () => {
    expect(() => Activity.create(props({ relatedOpportunityId: "opp-1" }))).toThrow(/exactly one/);
  });

  it("complete() sets completedAt and rejects completing twice", () => {
    const activity = Activity.create(props());
    const now = new Date("2026-01-01T00:00:00Z");
    activity.complete(now);
    expect(activity.isCompleted).toBe(true);
    expect(activity.completedAt).toBe(now);
    expect(() => activity.complete(new Date())).toThrow(/already completed/);
  });
});
