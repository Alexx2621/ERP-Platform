import { PriceList } from "./price-list.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "price-list-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "WHOLESALE",
    name: "Mayoreo",
    currency: "USD",
    validFrom: null,
    validUntil: null,
    status: "ACTIVE" as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("PriceList", () => {
  it("creates a price list with trimmed code/name and uppercased currency", () => {
    const priceList = PriceList.create({ ...baseProps(), code: "  WHOLESALE  ", name: "  Mayoreo  ", currency: "usd" });
    expect(priceList.code).toBe("WHOLESALE");
    expect(priceList.name).toBe("Mayoreo");
    expect(priceList.currency).toBe("USD");
  });

  it("rejects an empty code", () => {
    expect(() => PriceList.create({ ...baseProps(), code: "   " })).toThrow("Price list code is required.");
  });

  it("rejects an empty name", () => {
    expect(() => PriceList.create({ ...baseProps(), name: "   " })).toThrow("Price list name is required.");
  });

  it("rejects a malformed currency", () => {
    expect(() => PriceList.create({ ...baseProps(), currency: "US" })).toThrow(/ISO 4217/);
    expect(() => PriceList.create({ ...baseProps(), currency: "12" })).toThrow(/ISO 4217/);
  });

  it("rejects validFrom after validUntil", () => {
    expect(() =>
      PriceList.create({
        ...baseProps(),
        validFrom: new Date("2026-06-01"),
        validUntil: new Date("2026-01-01"),
      }),
    ).toThrow("Price list validFrom must not be after validUntil.");
  });

  it("accepts validFrom equal to validUntil", () => {
    const date = new Date("2026-06-01");
    expect(() => PriceList.create({ ...baseProps(), validFrom: date, validUntil: date })).not.toThrow();
  });

  it("updates name/currency/validity, bumping version", () => {
    const priceList = PriceList.create(baseProps());
    priceList.update("Mayoreo 2026", {
      currency: "gtq",
      validFrom: new Date("2026-01-01"),
      validUntil: new Date("2026-12-31"),
    });
    expect(priceList.name).toBe("Mayoreo 2026");
    expect(priceList.currency).toBe("GTQ");
    expect(priceList.validFrom).toEqual(new Date("2026-01-01"));
    expect(priceList.version).toBe(2);
  });

  it("rejects updating to an empty name", () => {
    const priceList = PriceList.create(baseProps());
    expect(() => priceList.update("   ", { currency: "USD", validFrom: null, validUntil: null })).toThrow(
      "Price list name is required.",
    );
  });

  it("toggles status idempotently, only bumping version on a real change", () => {
    const priceList = PriceList.create(baseProps());
    priceList.setStatus("ACTIVE");
    expect(priceList.version).toBe(1);
    priceList.setStatus("INACTIVE");
    expect(priceList.status).toBe("INACTIVE");
    expect(priceList.version).toBe(2);
  });
});
