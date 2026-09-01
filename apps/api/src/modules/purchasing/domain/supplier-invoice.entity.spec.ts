import { SupplierInvoice, SupplierInvoiceProps } from "./supplier-invoice.entity";

function buildProps(overrides: Partial<SupplierInvoiceProps> = {}): SupplierInvoiceProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "invoice-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    supplierId: "supplier-1",
    purchaseOrderId: "order-1",
    invoiceNumber: "  INV-100  ",
    amount: "1250",
    currency: "usd",
    issueDate: new Date("2026-09-01"),
    dueDate: new Date("2026-10-01"),
    status: "RECORDED",
    notes: null,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    ...overrides,
  };
}

describe("SupplierInvoice", () => {
  it("normalizes currency to uppercase and trims the invoice number", () => {
    const invoice = SupplierInvoice.create(buildProps());
    expect(invoice.currency).toBe("USD");
    expect(invoice.invoiceNumber).toBe("INV-100");
  });

  it("rejects an invalid currency code", () => {
    expect(() => SupplierInvoice.create(buildProps({ currency: "US" }))).toThrow(/3-letter ISO 4217/);
  });

  it("rejects a blank invoice number", () => {
    expect(() => SupplierInvoice.create(buildProps({ invoiceNumber: "   " }))).toThrow(/invoice number is required/);
  });

  it("rejects a non-positive amount", () => {
    expect(() => SupplierInvoice.create(buildProps({ amount: "0" }))).toThrow(/must be a positive decimal/);
  });

  it("rejects a dueDate before issueDate", () => {
    expect(() =>
      SupplierInvoice.create(buildProps({ issueDate: new Date("2026-10-01"), dueDate: new Date("2026-09-01") })),
    ).toThrow(/issueDate must not be after dueDate/);
  });

  it("allows no dueDate", () => {
    const invoice = SupplierInvoice.create(buildProps({ dueDate: null }));
    expect(invoice.dueDate).toBeNull();
  });

  it("cancels a RECORDED invoice", () => {
    const invoice = SupplierInvoice.create(buildProps());
    const now = new Date("2026-09-05T00:00:00.000Z");
    invoice.cancel(now);
    expect(invoice.status).toBe("CANCELLED");
    expect(invoice.cancelledAt).toBe(now);
  });

  it("rejects cancelling an already-CANCELLED invoice", () => {
    const invoice = SupplierInvoice.create(buildProps({ status: "CANCELLED" }));
    expect(() => invoice.cancel(new Date())).toThrow(/Cannot cancel a supplier invoice in status CANCELLED/);
  });
});
