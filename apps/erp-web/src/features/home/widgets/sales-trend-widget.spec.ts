import type { SalesOrderResponse } from "@erp/api-client";
import { buildDailyTotals } from "./sales-trend-widget";

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

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

describe("buildDailyTotals", () => {
  it("returns exactly one bucket per day in the window, oldest first", () => {
    const buckets = buildDailyTotals([], 7);
    expect(buckets).toHaveLength(7);
    expect(new Date(buckets[0]!.date).getTime()).toBeLessThan(new Date(buckets[6]!.date).getTime());
  });

  it("sums same-day orders into one bucket", () => {
    const buckets = buildDailyTotals(
      [order({ total: "100.0000", createdAt: isoDaysAgo(0) }), order({ total: "50.0000", createdAt: isoDaysAgo(0) })],
      7,
    );
    expect(buckets[6]!.total).toBe(150);
  });

  it("excludes cancelled orders from the total", () => {
    const buckets = buildDailyTotals(
      [order({ total: "999.0000", status: "CANCELLED", createdAt: isoDaysAgo(0) })],
      7,
    );
    expect(buckets[6]!.total).toBe(0);
  });

  it("ignores an order outside the requested window", () => {
    const buckets = buildDailyTotals([order({ total: "100.0000", createdAt: isoDaysAgo(10) })], 7);
    expect(buckets.reduce((sum, day) => sum + day.total, 0)).toBe(0);
  });
});
