import { SalesReturn } from "./sales-return.entity";

describe("SalesReturn", () => {
  it("trims a provided reason", () => {
    const salesReturn = SalesReturn.create({
      id: "return-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      salesOrderId: "order-1",
      reason: "  damaged in transit  ",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(salesReturn.reason).toBe("damaged in transit");
  });

  it("collapses a blank reason to null", () => {
    const salesReturn = SalesReturn.create({
      id: "return-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      salesOrderId: "order-1",
      reason: "   ",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(salesReturn.reason).toBeNull();
  });

  it("accepts a null reason", () => {
    const salesReturn = SalesReturn.create({
      id: "return-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      salesOrderId: "order-1",
      reason: null,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(salesReturn.reason).toBeNull();
  });

  it("has no status field — it is an append-only record", () => {
    const salesReturn = SalesReturn.create({
      id: "return-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      salesOrderId: "order-1",
      reason: null,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect((salesReturn.toProps() as Record<string, unknown>).status).toBeUndefined();
  });
});
