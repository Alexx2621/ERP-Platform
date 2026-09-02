import { Cart } from "./cart.entity";

function baseProps() {
  return {
    id: "cart-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    storefrontId: "sf-1",
    currency: "usd",
    status: "OPEN" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Cart entity", () => {
  it("uppercases currency", () => {
    expect(Cart.create(baseProps()).currency).toBe("USD");
  });

  it("converts OPEN -> CONVERTED", () => {
    const cart = Cart.create(baseProps());
    cart.convert();
    expect(cart.status).toBe("CONVERTED");
  });

  it("rejects converting a non-OPEN cart", () => {
    const cart = Cart.create({ ...baseProps(), status: "CONVERTED" });
    expect(() => cart.convert()).toThrow();
  });
});
