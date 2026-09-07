import type { SalesOrderResponse } from "@erp/api-client";
import { buildTopCustomers } from "./top-lists-widget";

function order(overrides: Partial<SalesOrderResponse>): SalesOrderResponse {
  return {
    id: `order-${Math.random()}`,
    number: "PED-000001",
    customerId: "customer-1",
    quoteId: null,
    channel: "ERP",
    status: "CONFIRMED",
    currency: "USD",
    total: "0.0000",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("buildTopCustomers", () => {
  it("ranks customers by summed revenue, highest first", () => {
    const ranking = buildTopCustomers([
      order({ customerId: "customer-a", total: "100.0000" }),
      order({ customerId: "customer-b", total: "500.0000" }),
      order({ customerId: "customer-a", total: "50.0000" }),
    ]);
    expect(ranking).toEqual([
      { customerId: "customer-b", total: 500 },
      { customerId: "customer-a", total: 150 },
    ]);
  });

  it("excludes cancelled orders", () => {
    const ranking = buildTopCustomers([order({ customerId: "customer-a", total: "999.0000", status: "CANCELLED" })]);
    expect(ranking).toEqual([]);
  });

  it("excludes an order outside the window", () => {
    const old = new Date();
    old.setUTCDate(old.getUTCDate() - 60);
    const ranking = buildTopCustomers([order({ customerId: "customer-a", total: "100.0000", createdAt: old.toISOString() })], 30);
    expect(ranking).toEqual([]);
  });

  it("caps the ranking at five customers", () => {
    const orders = Array.from({ length: 8 }, (_, index) =>
      order({ customerId: `customer-${index}`, total: `${index + 1}.0000` }),
    );
    expect(buildTopCustomers(orders)).toHaveLength(5);
  });
});
