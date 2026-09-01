import { QuoteLine, QuoteLineInput, QuoteLineProps } from "./quote-line.entity";

function buildInput(overrides: Partial<QuoteLineInput> = {}): QuoteLineInput {
  return {
    id: "line-1",
    tenantId: "tenant-1",
    quoteId: "quote-1",
    productId: "product-1",
    productVariantId: null,
    taxId: null,
    quantity: "3",
    unitPrice: "10.5",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("QuoteLine", () => {
  it("computes lineTotal from quantity x unitPrice with no discount/tax", () => {
    const line = QuoteLine.create(buildInput());
    expect(line.lineTotal).toBe("31.5000");
    expect(line.discountAmount).toBe("0");
    expect(line.taxRate).toBe("0");
  });

  it("subtracts the discount before computing tax", () => {
    const line = QuoteLine.create(buildInput({ quantity: "2", unitPrice: "50", discountAmount: "10" }));
    // subtotal = 100 - 10 = 90, no tax
    expect(line.lineTotal).toBe("90.0000");
  });

  it("adds tax computed on the post-discount subtotal", () => {
    const line = QuoteLine.create(
      buildInput({ quantity: "2", unitPrice: "50", discountAmount: "10", taxRate: "10" }),
    );
    // subtotal = 90, tax = 9, total = 99
    expect(line.lineTotal).toBe("99.0000");
  });

  it("rejects a non-positive quantity", () => {
    expect(() => QuoteLine.create(buildInput({ quantity: "0" }))).toThrow(/quantity must be a positive decimal/);
  });

  it("rejects a negative unit price", () => {
    expect(() => QuoteLine.create(buildInput({ unitPrice: "-1" }))).toThrow(
      /unitPrice must be a non-negative decimal/,
    );
  });

  it("rejects a negative discount", () => {
    expect(() => QuoteLine.create(buildInput({ discountAmount: "-1" }))).toThrow(
      /discountAmount must be a non-negative decimal/,
    );
  });

  it("fromProps trusts the stored lineTotal without recomputing it", () => {
    const staleProps: QuoteLineProps = {
      id: "line-1",
      tenantId: "tenant-1",
      quoteId: "quote-1",
      productId: "product-1",
      productVariantId: null,
      taxId: null,
      quantity: "3",
      unitPrice: "10.5",
      discountAmount: "0",
      taxRate: "0",
      lineTotal: "999.0000", // deliberately does not match quantity*unitPrice
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    const line = QuoteLine.fromProps(staleProps);
    expect(line.lineTotal).toBe("999.0000");
  });

  it("toProps returns an independent snapshot", () => {
    const line = QuoteLine.create(buildInput());
    const props = line.toProps();
    expect(props.lineTotal).toBe("31.5000");
  });
});
