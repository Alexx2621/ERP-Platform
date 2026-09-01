import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import {
  PurchaseOrderLineNotFoundError,
  PurchaseOrderNotConfirmedError,
  PurchaseOrderNotFoundError,
  PurchaseReceiptExceedsOrderedQuantityError,
  PurchaseReceiptHasNoLinesError,
} from "../errors";

async function buildConfirmedOrder(ctx: Awaited<ReturnType<typeof buildPurchasingTestContext>>, quantity: string) {
  const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
  await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity });
  await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
  const [line] = await ctx.listPurchaseOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
  return { order, line };
}

describe("CreatePurchaseReceiptUseCase", () => {
  it("rejects a receipt for an order that is not CONFIRMED", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    await expect(
      ctx.createPurchaseReceipt.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, purchaseOrderId: order.id, lines: [] }),
    ).rejects.toThrow(PurchaseOrderNotConfirmedError);
  });

  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildConfirmedOrder(ctx, "10");
    await expect(
      ctx.createPurchaseReceipt.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, purchaseOrderId: order.id, lines: [] }),
    ).rejects.toThrow(PurchaseOrderNotFoundError);
  });

  it("rejects a receipt with no lines", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildConfirmedOrder(ctx, "10");
    await expect(
      ctx.createPurchaseReceipt.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, purchaseOrderId: order.id, lines: [] }),
    ).rejects.toThrow(PurchaseReceiptHasNoLinesError);
  });

  it("rejects a line referencing an order line that does not belong to this order", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildConfirmedOrder(ctx, "10");
    await expect(
      ctx.createPurchaseReceipt.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: "missing-line", quantity: "1" }],
      }),
    ).rejects.toThrow(PurchaseOrderLineNotFoundError);
  });

  it("records a partial receipt, posting a real RECEIPT inventory movement that raises on-hand stock", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildConfirmedOrder(ctx, "10");

    const receipt = await ctx.createPurchaseReceipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      notes: "Primer envío parcial",
      lines: [{ purchaseOrderLineId: line.id, quantity: "4" }],
    });
    expect(receipt.notes).toBe("Primer envío parcial");
    expect(receipt.purchaseOrderId).toBe(order.id);

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.onHandQuantity).toBe("4.0000");

    const receiptLines = await ctx.listPurchaseReceiptLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseReceiptId: receipt.id });
    expect(receiptLines).toHaveLength(1);
    expect(receiptLines[0].quantity).toBe("4");

    // CONFIRMED status is unaffected by a partial receipt — the order only
    // advances to CLOSED via an explicit close action.
    const reloadedOrder = await ctx.getPurchaseOrder.execute(ctx.tenantId, order.id);
    expect(reloadedOrder!.status).toBe("CONFIRMED");
  });

  it("rejects a receipt that would exceed the ordered quantity in a single request", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildConfirmedOrder(ctx, "10");
    await expect(
      ctx.createPurchaseReceipt.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "11" }],
      }),
    ).rejects.toThrow(PurchaseReceiptExceedsOrderedQuantityError);
  });

  it("computes the running sum across several separate receipts over time, and rejects once the cumulative total would exceed what was ordered", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildConfirmedOrder(ctx, "10");

    // First receipt: 6 of 10 — allowed.
    await ctx.createPurchaseReceipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "6" }],
    });

    // Second receipt: 4 more — exactly the remaining quantity, allowed.
    await ctx.createPurchaseReceipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "4" }],
    });

    // Third receipt: even 1 more now exceeds the cumulative ordered quantity (10).
    await expect(
      ctx.createPurchaseReceipt.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PurchaseReceiptExceedsOrderedQuantityError);

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.onHandQuantity).toBe("10.0000");
  });

  it("skips posting an inventory movement for a line whose product does not track inventory", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const line = await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.untrackedProduct.id, quantity: "5" });
    await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });

    await ctx.createPurchaseReceipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "5" }],
    });

    expect(ctx.balances.items).toHaveLength(0);
  });

  it("lists receipts scoped to a company", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildConfirmedOrder(ctx, "10");
    await ctx.createPurchaseReceipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "1" }],
    });
    const receipts = await ctx.listPurchaseReceipts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(receipts).toHaveLength(1);
  });
});
