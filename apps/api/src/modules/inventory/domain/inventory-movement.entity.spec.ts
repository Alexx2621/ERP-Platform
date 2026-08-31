import { InventoryMovement, InventoryMovementProps } from "./inventory-movement.entity";

function baseProps(overrides: Partial<InventoryMovementProps> = {}): InventoryMovementProps {
  return {
    id: "movement-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    warehouseId: "warehouse-1",
    productId: "product-1",
    productVariantId: null,
    type: "RECEIPT",
    quantity: "5.0000",
    reason: null,
    referenceType: "MANUAL",
    referenceId: null,
    correlationId: "correlation-1",
    createdByUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("InventoryMovement", () => {
  it.each(["RECEIPT", "TRANSFER_IN", "TRANSFER_CANCELLED", "RESERVATION"] as const)(
    "requires a positive quantity for %s",
    (type) => {
      expect(() => InventoryMovement.create(baseProps({ type, quantity: "-5.0000" }))).toThrow(
        /must have a positive quantity/,
      );
      expect(InventoryMovement.create(baseProps({ type, quantity: "5.0000" })).quantity).toBe("5.0000");
    },
  );

  it.each(["ISSUE", "TRANSFER_OUT", "RELEASE"] as const)("requires a negative quantity for %s", (type) => {
    expect(() => InventoryMovement.create(baseProps({ type, quantity: "5.0000" }))).toThrow(
      /must have a negative quantity/,
    );
    expect(InventoryMovement.create(baseProps({ type, quantity: "-5.0000" })).quantity).toBe("-5.0000");
  });

  it("allows either sign for ADJUSTMENT, but requires a reason", () => {
    expect(() => InventoryMovement.create(baseProps({ type: "ADJUSTMENT", quantity: "5.0000", reason: null }))).toThrow(
      /requires a reason/,
    );
    expect(
      InventoryMovement.create(baseProps({ type: "ADJUSTMENT", quantity: "-5.0000", reason: "Damaged goods" })).quantity,
    ).toBe("-5.0000");
    expect(
      InventoryMovement.create(baseProps({ type: "ADJUSTMENT", quantity: "5.0000", reason: "Found extra stock" })).quantity,
    ).toBe("5.0000");
  });

  it("rejects a zero quantity", () => {
    expect(() => InventoryMovement.create(baseProps({ quantity: "0.0000" }))).toThrow();
  });

  it("reports affectsOnHand correctly per type", () => {
    expect(InventoryMovement.create(baseProps({ type: "RECEIPT" })).affectsOnHand).toBe(true);
    expect(InventoryMovement.create(baseProps({ type: "ISSUE", quantity: "-5.0000" })).affectsOnHand).toBe(true);
    expect(InventoryMovement.create(baseProps({ type: "RESERVATION" })).affectsOnHand).toBe(false);
    expect(InventoryMovement.create(baseProps({ type: "RELEASE", quantity: "-5.0000" })).affectsOnHand).toBe(false);
  });

  it("trims an empty reason string to null", () => {
    const movement = InventoryMovement.create(baseProps({ reason: "   " }));
    expect(movement.reason).toBeNull();
  });
});
