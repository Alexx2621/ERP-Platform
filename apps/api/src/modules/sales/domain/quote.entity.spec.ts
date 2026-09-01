import { Quote, QuoteProps } from "./quote.entity";

function buildProps(overrides: Partial<QuoteProps> = {}): QuoteProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "quote-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    customerId: "customer-1",
    channel: "ERP",
    status: "DRAFT",
    currency: "usd",
    notes: "  some notes  ",
    version: 1,
    createdAt: now,
    updatedAt: now,
    convertedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("Quote", () => {
  it("normalizes currency to uppercase and trims notes", () => {
    const quote = Quote.create(buildProps());
    expect(quote.currency).toBe("USD");
    expect(quote.notes).toBe("some notes");
  });

  it("collapses blank notes to null", () => {
    const quote = Quote.create(buildProps({ notes: "   " }));
    expect(quote.notes).toBeNull();
  });

  it("rejects a currency that is not a 3-letter code", () => {
    expect(() => Quote.create(buildProps({ currency: "US" }))).toThrow(/3-letter ISO 4217/);
    expect(() => Quote.create(buildProps({ currency: "USDD" }))).toThrow(/3-letter ISO 4217/);
  });

  it("converts a DRAFT quote and bumps the version", () => {
    const quote = Quote.create(buildProps());
    const now = new Date("2026-09-02T00:00:00.000Z");
    quote.convert(now);
    expect(quote.status).toBe("CONVERTED");
    expect(quote.convertedAt).toBe(now);
    expect(quote.version).toBe(2);
  });

  it("cancels a DRAFT quote and bumps the version", () => {
    const quote = Quote.create(buildProps());
    const now = new Date("2026-09-02T00:00:00.000Z");
    quote.cancel(now);
    expect(quote.status).toBe("CANCELLED");
    expect(quote.cancelledAt).toBe(now);
    expect(quote.version).toBe(2);
  });

  it("rejects converting a non-DRAFT quote", () => {
    const quote = Quote.create(buildProps({ status: "CANCELLED" }));
    expect(() => quote.convert(new Date())).toThrow(/Cannot convert a quote in status CANCELLED/);
  });

  it("rejects cancelling a non-DRAFT quote", () => {
    const quote = Quote.create(buildProps({ status: "CONVERTED" }));
    expect(() => quote.cancel(new Date())).toThrow(/Cannot cancel a quote in status CONVERTED/);
  });

  it("toProps returns a snapshot independent of the entity", () => {
    const quote = Quote.create(buildProps());
    const props = quote.toProps();
    expect(props.id).toBe("quote-1");
    expect(props).not.toBe((quote as unknown as { props: QuoteProps }).props);
  });
});
