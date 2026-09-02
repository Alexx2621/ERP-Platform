import { Storefront } from "./storefront.entity";

function baseProps() {
  return {
    id: "sf-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    defaultWarehouseId: null,
    code: "Main-Store",
    name: " Tienda ",
    domain: null,
    currency: "usd",
    status: "ACTIVE" as const,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Storefront entity", () => {
  it("lowercases the code and uppercases the currency, trims the name", () => {
    const storefront = Storefront.create(baseProps());
    expect(storefront.code).toBe("main-store");
    expect(storefront.currency).toBe("USD");
    expect(storefront.name).toBe("Tienda");
  });

  it("rejects an invalid code", () => {
    expect(() => Storefront.create({ ...baseProps(), code: "a" })).toThrow();
    expect(() => Storefront.create({ ...baseProps(), code: "Has Spaces" })).toThrow();
  });

  it("rejects a currency that is not a 3-letter code", () => {
    expect(() => Storefront.create({ ...baseProps(), currency: "US" })).toThrow();
  });

  it("setStatus is a no-op when already at that status, otherwise bumps version", () => {
    const storefront = Storefront.create(baseProps());
    storefront.setStatus("ACTIVE");
    expect(storefront.version).toBe(1);
    storefront.setStatus("INACTIVE");
    expect(storefront.status).toBe("INACTIVE");
    expect(storefront.version).toBe(2);
  });
});
