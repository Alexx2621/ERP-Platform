import { ProductionOrderOperation, ProductionOrderOperationProps } from "./production-order-operation.entity";

function buildProps(overrides: Partial<ProductionOrderOperationProps> = {}): ProductionOrderOperationProps {
  return {
    id: "operation-1",
    tenantId: "tenant-1",
    productionOrderId: "order-1",
    name: "Corte",
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date("2026-09-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ProductionOrderOperation", () => {
  it("trims the name", () => {
    const operation = ProductionOrderOperation.create(buildProps({ name: "  Corte  " }));
    expect(operation.name).toBe("Corte");
  });

  it("rejects a blank name", () => {
    expect(() => ProductionOrderOperation.create(buildProps({ name: "   " }))).toThrow(/name is required/);
  });

  it("completes an operation", () => {
    const operation = ProductionOrderOperation.create(buildProps());
    const now = new Date("2026-09-04T00:00:00.000Z");
    operation.complete(now);
    expect(operation.completedAt).toBe(now);
  });

  it("rejects completing an already-completed operation", () => {
    const operation = ProductionOrderOperation.create(buildProps({ completedAt: new Date("2026-09-03T01:00:00.000Z") }));
    expect(() => operation.complete(new Date())).toThrow(/already completed/);
  });
});
