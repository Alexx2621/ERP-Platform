import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import {
  PurchaseOrderLineNotFoundError,
  PurchaseOrderNotFoundError,
  PurchaseReturnExceedsReceivedQuantityError,
  PurchaseReturnHasNoLinesError,
} from "../errors";

async function buildReceivedOrder(ctx: Awaited<ReturnType<typeof buildPurchasingTestContext>>, orderedQuantity: string, receivedQuantity: string) {
  const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
  await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: orderedQuantity });
  await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
  const [line] = await ctx.listPurchaseOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
  await ctx.createPurchaseReceipt.execute({
    tenantId: ctx.tenantId,
    companyId: ctx.companyId,
    actorUserId: ctx.actorUserId,
    correlationId: ctx.correlationId,
    purchaseOrderId: order.id,
    lines: [{ purchaseOrderLineId: line.id, quantity: receivedQuantity }],
  });
  return { order, line };
}

describe("CreatePurchaseReturnUseCase", () => {
  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildReceivedOrder(ctx, "10", "10");
    await expect(
      ctx.createPurchaseReturn.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, purchaseOrderId: order.id, lines: [] }),
    ).rejects.toThrow(PurchaseOrderNotFoundError);
  });

  it("rejects a return with no lines", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildReceivedOrder(ctx, "10", "10");
    await expect(
      ctx.createPurchaseReturn.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, purchaseOrderId: order.id, lines: [] }),
    ).rejects.toThrow(PurchaseReturnHasNoLinesError);
  });

  it("rejects a line referencing an order line that does not belong to this order", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order } = await buildReceivedOrder(ctx, "10", "10");
    await expect(
      ctx.createPurchaseReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: "missing-line", quantity: "1" }],
      }),
    ).rejects.toThrow(PurchaseOrderLineNotFoundError);
  });

  it("rejects a return when nothing has ever been received for the line", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const line = await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
    await expect(
      ctx.createPurchaseReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PurchaseReturnExceedsReceivedQuantityError);
  });

  it("records a return within the received quantity, posting a real ISSUE inventory movement that reduces on-hand stock", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildReceivedOrder(ctx, "10", "10");

    const balanceBeforeReturn = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balanceBeforeReturn.onHandQuantity).toBe("10.0000");

    const purchaseReturn = await ctx.createPurchaseReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      reason: "Producto defectuoso",
      lines: [{ purchaseOrderLineId: line.id, quantity: "3" }],
    });
    expect(purchaseReturn.reason).toBe("Producto defectuoso");
    expect(purchaseReturn.purchaseOrderId).toBe(order.id);

    const balanceAfterReturn = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balanceAfterReturn.onHandQuantity).toBe("7.0000");

    const returnLines = await ctx.listPurchaseReturnLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseReturnId: purchaseReturn.id });
    expect(returnLines).toHaveLength(1);
    expect(returnLines[0].quantity).toBe("3");
  });

  it("rejects a return that would exceed the received quantity in a single request", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildReceivedOrder(ctx, "10", "4");
    await expect(
      ctx.createPurchaseReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "5" }],
      }),
    ).rejects.toThrow(PurchaseReturnExceedsReceivedQuantityError);
  });

  it("computes the running sum across several separate returns over time, and rejects once the cumulative total would exceed what was received", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildReceivedOrder(ctx, "10", "5");

    // First return: 3 of 5 received — allowed.
    await ctx.createPurchaseReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "3" }],
    });

    // Second return: 2 more — exactly the remaining received quantity, allowed.
    await ctx.createPurchaseReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "2" }],
    });

    // Third return: even 1 more now exceeds the cumulative received quantity (5).
    await expect(
      ctx.createPurchaseReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PurchaseReturnExceedsReceivedQuantityError);
  });

  it("lists returns scoped to a company", async () => {
    const ctx = await buildPurchasingTestContext();
    const { order, line } = await buildReceivedOrder(ctx, "10", "5");
    await ctx.createPurchaseReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      purchaseOrderId: order.id,
      lines: [{ purchaseOrderLineId: line.id, quantity: "1" }],
    });
    const returns = await ctx.listPurchaseReturns.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(returns).toHaveLength(1);
  });
});
