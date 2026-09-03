import { Opportunity, OpportunityProps } from "./opportunity.entity";

function props(overrides: Partial<OpportunityProps> = {}): OpportunityProps {
  const now = new Date();
  return {
    id: "opp-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    name: "Acme Renewal",
    pipelineId: "pipeline-1",
    stageId: "stage-1",
    customerId: null,
    leadId: null,
    amount: "1000.0000",
    currency: "USD",
    expectedCloseDate: null,
    status: "OPEN",
    ownerId: "user-1",
    closedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Opportunity", () => {
  it("rejects an empty name", () => {
    expect(() => Opportunity.create(props({ name: " " }))).toThrow();
  });

  it("rejects a negative amount", () => {
    expect(() => Opportunity.create(props({ amount: "-10.0000" }))).toThrow();
  });

  it("moveToStage() moves within the pipeline without closing when no outcome is given", () => {
    const opp = Opportunity.create(props());
    opp.moveToStage("stage-2", null, new Date());
    expect(opp.stageId).toBe("stage-2");
    expect(opp.status).toBe("OPEN");
    expect(opp.closedAt).toBeNull();
  });

  it("moveToStage() with a WON outcome closes the opportunity", () => {
    const opp = Opportunity.create(props());
    const now = new Date("2026-01-01T00:00:00Z");
    opp.moveToStage("stage-won", "WON", now);
    expect(opp.status).toBe("WON");
    expect(opp.closedAt).toBe(now);
  });

  it("moveToStage() rejects moving an already-closed opportunity", () => {
    const opp = Opportunity.create(props());
    opp.moveToStage("stage-won", "WON", new Date());
    expect(() => opp.moveToStage("stage-1", null, new Date())).toThrow(/Cannot move/);
  });

  it("update() rejects a negative amount and preserves the entity on failure", () => {
    const opp = Opportunity.create(props());
    expect(() => opp.update({ name: "Renamed", amount: "-5", expectedCloseDate: null })).toThrow();
    expect(opp.name).toBe("Acme Renewal");
  });
});
