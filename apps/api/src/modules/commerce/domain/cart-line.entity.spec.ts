import { CartLine } from "./cart-line.entity";

function baseProps() {
  return {
    id: "line-1",
    tenantId: "tenant-1",
    cartId: "cart-1",
    productId: "product-1",
    productVariantId: null,
    quantity: "2.0000",
    unitPrice: "9.9900",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("CartLine entity", () => {
  it("rejects a zero or negative quantity/unitPrice", () => {
    expect(() => CartLine.create({ ...baseProps(), quantity: "0" })).toThrow();
    expect(() => CartLine.create({ ...baseProps(), unitPrice: "-1" })).toThrow();
  });

  it("setQuantity replaces the quantity", () => {
    const line = CartLine.create(baseProps());
    line.setQuantity("5.0000");
    expect(line.quantity).toBe("5.0000");
  });
});
