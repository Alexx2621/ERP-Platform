import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import {
  PurchaseOrderNotFoundError,
  SupplierInvoiceNotFoundError,
  SupplierInvoiceNotRecordedError,
  SupplierInvoiceOrderMismatchError,
  SupplierNotFoundError,
} from "../errors";

describe("SupplierInvoice lifecycle use cases", () => {
  it("records an invoice traced to a real purchase order of the given supplier", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });

    const invoice = await ctx.createSupplierInvoice.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      supplierId: ctx.supplier.id,
      purchaseOrderId: order.id,
      invoiceNumber: "INV-100",
      amount: "1250.0000",
      currency: "usd",
      issueDate: "2026-09-01",
      dueDate: "2026-10-01",
    });
    expect(invoice.status).toBe("RECORDED");
    expect(invoice.currency).toBe("USD");
    expect(invoice.purchaseOrderId).toBe(order.id);
  });

  it("rejects an unknown supplierId", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    await expect(
      ctx.createSupplierInvoice.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        supplierId: "missing",
        purchaseOrderId: order.id,
        invoiceNumber: "INV-100",
        amount: "100",
        currency: "USD",
        issueDate: "2026-09-01",
      }),
    ).rejects.toThrow(SupplierNotFoundError);
  });

  it("rejects an unknown purchaseOrderId", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.createSupplierInvoice.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        supplierId: ctx.supplier.id,
        purchaseOrderId: "missing",
        invoiceNumber: "INV-100",
        amount: "100",
        currency: "USD",
        issueDate: "2026-09-01",
      }),
    ).rejects.toThrow(PurchaseOrderNotFoundError);
  });

  it("rejects a real purchase order that belongs to a different supplier than the one given — prevents recording an invoice against a competitor's order by mistake", async () => {
    const ctx = await buildPurchasingTestContext();
    const orderForFirstSupplier = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });

    await expect(
      ctx.createSupplierInvoice.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        supplierId: ctx.secondSupplier.id,
        purchaseOrderId: orderForFirstSupplier.id,
        invoiceNumber: "INV-100",
        amount: "100",
        currency: "USD",
        issueDate: "2026-09-01",
      }),
    ).rejects.toThrow(SupplierInvoiceOrderMismatchError);
  });

  it("cancels a RECORDED invoice", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const invoice = await ctx.createSupplierInvoice.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      supplierId: ctx.supplier.id,
      purchaseOrderId: order.id,
      invoiceNumber: "INV-100",
      amount: "100",
      currency: "USD",
      issueDate: "2026-09-01",
    });

    const cancelled = await ctx.cancelSupplierInvoice.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierInvoiceId: invoice.id });
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancelling an already-CANCELLED invoice", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const invoice = await ctx.createSupplierInvoice.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      supplierId: ctx.supplier.id,
      purchaseOrderId: order.id,
      invoiceNumber: "INV-100",
      amount: "100",
      currency: "USD",
      issueDate: "2026-09-01",
    });
    await ctx.cancelSupplierInvoice.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierInvoiceId: invoice.id });

    await expect(
      ctx.cancelSupplierInvoice.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierInvoiceId: invoice.id }),
    ).rejects.toThrow(SupplierInvoiceNotRecordedError);
  });

  it("rejects operating on an unknown invoice", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.cancelSupplierInvoice.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierInvoiceId: "missing" }),
    ).rejects.toThrow(SupplierInvoiceNotFoundError);
  });

  it("lists invoices scoped to a company", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    await ctx.createSupplierInvoice.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      supplierId: ctx.supplier.id,
      purchaseOrderId: order.id,
      invoiceNumber: "INV-100",
      amount: "100",
      currency: "USD",
      issueDate: "2026-09-01",
    });
    const invoices = await ctx.listSupplierInvoices.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(invoices).toHaveLength(1);
  });
});
