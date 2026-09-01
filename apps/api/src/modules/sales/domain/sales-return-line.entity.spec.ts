import { SalesReturnLine } from "./sales-return-line.entity";

describe("SalesReturnLine", () => {
  it("accepts a positive quantity", () => {
    const line = SalesReturnLine.create({
      id: "return-line-1",
      tenantId: "tenant-1",
      salesReturnId: "return-1",
      salesOrderLineId: "order-line-1",
      quantity: "2.5",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(line.quantity).toBe("2.5");
  });

  it("rejects a zero quantity", () => {
    expect(() =>
      SalesReturnLine.create({
        id: "return-line-1",
        tenantId: "tenant-1",
        salesReturnId: "return-1",
        salesOrderLineId: "order-line-1",
        quantity: "0",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).toThrow(/quantity must be a positive decimal/);
  });

  it("rejects a negative quantity", () => {
    expect(() =>
      SalesReturnLine.create({
        id: "return-line-1",
        tenantId: "tenant-1",
        salesReturnId: "return-1",
        salesOrderLineId: "order-line-1",
        quantity: "-1",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).toThrow(/quantity must be a positive decimal/);
  });
});
