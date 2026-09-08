import { Plan, PlanProps } from "./plan.entity";

function baseProps(overrides: Partial<PlanProps> = {}): PlanProps {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "plan-1",
    key: "starter",
    name: "Starter",
    description: "A starter plan.",
    currency: "GTQ",
    basePriceAmount: "299.0000",
    perUserPriceAmount: "29.0000",
    includesAppKeys: ["catalog"],
    isSelfServe: true,
    recurrenteProductId: null,
    recurrentePriceId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Plan", () => {
  it("creates a valid plan", () => {
    const plan = Plan.create(baseProps());
    expect(plan.key).toBe("starter");
    expect(plan.includesAppKeys).toEqual(["catalog"]);
  });

  it("rejects a non-kebab-case key", () => {
    expect(() => Plan.create(baseProps({ key: "Starter" }))).toThrow();
  });

  it("rejects a currency that is not a 3-letter code", () => {
    expect(() => Plan.create(baseProps({ currency: "Q" }))).toThrow();
  });

  it("rejects a malformed basePriceAmount", () => {
    expect(() => Plan.create(baseProps({ basePriceAmount: "not-a-number" }))).toThrow();
  });

  it("rejects a malformed perUserPriceAmount", () => {
    expect(() => Plan.create(baseProps({ perUserPriceAmount: "-5" }))).toThrow();
  });

  it("attachRecurrenteProduct sets both ids and touches updatedAt", () => {
    const plan = Plan.create(baseProps());
    const now = new Date("2026-02-01T00:00:00.000Z");
    plan.attachRecurrenteProduct("prod_1", "price_1", now);
    expect(plan.recurrenteProductId).toBe("prod_1");
    expect(plan.recurrentePriceId).toBe("price_1");
    expect(plan.updatedAt).toEqual(now);
  });

  it("toProps returns a defensive copy of includesAppKeys", () => {
    const plan = Plan.create(baseProps());
    const props = plan.toProps();
    (props.includesAppKeys as string[]).push("mutated");
    expect(plan.includesAppKeys).toEqual(["catalog"]);
  });
});
