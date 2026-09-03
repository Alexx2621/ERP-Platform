import {
  ProductionOrderMaterialMovement,
  ProductionOrderMaterialMovementProps,
} from "./production-order-material-movement.entity";

function buildProps(
  overrides: Partial<ProductionOrderMaterialMovementProps> = {},
): ProductionOrderMaterialMovementProps {
  return {
    id: "movement-1",
    tenantId: "tenant-1",
    productionOrderMaterialId: "material-1",
    type: "ISSUE",
    quantity: "5.0000",
    createdAt: new Date("2026-09-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ProductionOrderMaterialMovement", () => {
  it("accepts a positive quantity for an ISSUE", () => {
    const movement = ProductionOrderMaterialMovement.create(buildProps());
    expect(movement.type).toBe("ISSUE");
    expect(movement.quantity).toBe("5.0000");
  });

  it("accepts a positive quantity for a RETURN", () => {
    const movement = ProductionOrderMaterialMovement.create(buildProps({ type: "RETURN" }));
    expect(movement.type).toBe("RETURN");
  });

  it("rejects a zero quantity regardless of type", () => {
    expect(() => ProductionOrderMaterialMovement.create(buildProps({ quantity: "0" }))).toThrow(/positive decimal/);
  });
});
