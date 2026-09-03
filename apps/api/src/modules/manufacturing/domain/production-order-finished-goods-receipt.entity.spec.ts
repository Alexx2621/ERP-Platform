import {
  ProductionOrderFinishedGoodsReceipt,
  ProductionOrderFinishedGoodsReceiptProps,
} from "./production-order-finished-goods-receipt.entity";

function buildProps(
  overrides: Partial<ProductionOrderFinishedGoodsReceiptProps> = {},
): ProductionOrderFinishedGoodsReceiptProps {
  return {
    id: "receipt-1",
    tenantId: "tenant-1",
    productionOrderId: "order-1",
    quantity: "10.0000",
    createdAt: new Date("2026-09-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ProductionOrderFinishedGoodsReceipt", () => {
  it("accepts a positive quantity", () => {
    const receipt = ProductionOrderFinishedGoodsReceipt.create(buildProps());
    expect(receipt.quantity).toBe("10.0000");
  });

  it("rejects a zero quantity", () => {
    expect(() => ProductionOrderFinishedGoodsReceipt.create(buildProps({ quantity: "0" }))).toThrow(/positive decimal/);
  });
});
