import { PriceListItem } from "./price-list-item.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "item-1",
    tenantId: "tenant-1",
    priceListId: "price-list-1",
    productId: "product-1",
    price: "24.9900",
    createdAt: now,
    updatedAt: now,
  };
}

describe("PriceListItem", () => {
  it("creates an item with a valid decimal price", () => {
    const item = PriceListItem.create(baseProps());
    expect(item.price).toBe("24.9900");
  });

  it("rejects a malformed price", () => {
    expect(() => PriceListItem.create({ ...baseProps(), price: "not-a-number" })).toThrow(/price/);
  });

  it("reprices, updating updatedAt", () => {
    const item = PriceListItem.create(baseProps());
    const before = item.updatedAt;
    item.reprice("29.9900");
    expect(item.price).toBe("29.9900");
    expect(item.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("rejects repricing to a malformed value", () => {
    const item = PriceListItem.create(baseProps());
    expect(() => item.reprice("bad")).toThrow(/price/);
  });
});
