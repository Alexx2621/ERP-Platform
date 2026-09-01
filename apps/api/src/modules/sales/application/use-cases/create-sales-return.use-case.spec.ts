import { buildSalesTestContext } from "../../test-support/build-sales-test-context";
import {
  SalesOrderLineNotFoundError,
  SalesOrderNotFoundError,
  SalesOrderNotFulfilledError,
  SalesReturnExceedsFulfilledQuantityError,
  SalesReturnHasNoLinesError,
} from "../errors";

async function buildFulfilledOrder(ctx: Awaited<ReturnType<typeof buildSalesTestContext>>, quantity: string) {
  await ctx.receiveStock("100");
  const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
  await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity });
  await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
  await ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
  const [line] = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id });
  return { order, line };
}

describe("CreateSalesReturnUseCase", () => {
  it("rejects a return for an order that is not FULFILLED", async () => {
    const ctx = await buildSalesTestContext();
    const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await expect(
      ctx.createSalesReturn.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id, lines: [] }),
    ).rejects.toThrow(SalesOrderNotFulfilledError);
  });

  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildSalesTestContext();
    const { order } = await buildFulfilledOrder(ctx, "5");
    await expect(
      ctx.createSalesReturn.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id, lines: [] }),
    ).rejects.toThrow(SalesOrderNotFoundError);
  });

  it("rejects a return with no lines", async () => {
    const ctx = await buildSalesTestContext();
    const { order } = await buildFulfilledOrder(ctx, "5");
    await expect(
      ctx.createSalesReturn.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id, lines: [] }),
    ).rejects.toThrow(SalesReturnHasNoLinesError);
  });

  it("rejects a line referencing an order line that does not belong to this order", async () => {
    const ctx = await buildSalesTestContext();
    const { order } = await buildFulfilledOrder(ctx, "5");
    await expect(
      ctx.createSalesReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        salesOrderId: order.id,
        lines: [{ salesOrderLineId: "missing-line", quantity: "1" }],
      }),
    ).rejects.toThrow(SalesOrderLineNotFoundError);
  });

  it("records a return within the fulfilled quantity, posting a real RETURN inventory movement that restores on-hand stock", async () => {
    const ctx = await buildSalesTestContext();
    const { order, line } = await buildFulfilledOrder(ctx, "5");

    const balanceBeforeReturn = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balanceBeforeReturn.onHandQuantity).toBe("95.0000"); // 100 received - 5 issued

    const salesReturn = await ctx.createSalesReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      salesOrderId: order.id,
      reason: "Producto dañado",
      lines: [{ salesOrderLineId: line.id, quantity: "2" }],
    });
    expect(salesReturn.reason).toBe("Producto dañado");
    expect(salesReturn.salesOrderId).toBe(order.id);

    const balanceAfterReturn = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balanceAfterReturn.onHandQuantity).toBe("97.0000");

    const returnLines = await ctx.listSalesReturnLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesReturnId: salesReturn.id });
    expect(returnLines).toHaveLength(1);
    expect(returnLines[0].quantity).toBe("2");

    // FULFILLED status is unaffected by a return — a return is its own
    // append-only record, never a SalesOrder status mutation.
    const reloadedOrder = await ctx.getSalesOrder.execute(ctx.tenantId, order.id);
    expect(reloadedOrder!.status).toBe("FULFILLED");
  });

  it("rejects a return that would exceed the fulfilled quantity in a single request", async () => {
    const ctx = await buildSalesTestContext();
    const { order, line } = await buildFulfilledOrder(ctx, "5");
    await expect(
      ctx.createSalesReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        salesOrderId: order.id,
        lines: [{ salesOrderLineId: line.id, quantity: "6" }],
      }),
    ).rejects.toThrow(SalesReturnExceedsFulfilledQuantityError);
  });

  it("computes the running sum across several separate return requests over time, and rejects once the cumulative total would exceed what was fulfilled", async () => {
    const ctx = await buildSalesTestContext();
    const { order, line } = await buildFulfilledOrder(ctx, "5");

    // First return: 3 of 5 — allowed.
    await ctx.createSalesReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      salesOrderId: order.id,
      lines: [{ salesOrderLineId: line.id, quantity: "3" }],
    });

    // Second return: 2 more — exactly the remaining quantity, allowed.
    await ctx.createSalesReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      salesOrderId: order.id,
      lines: [{ salesOrderLineId: line.id, quantity: "2" }],
    });

    // Third return: even 1 more now exceeds the cumulative fulfilled quantity (5).
    await expect(
      ctx.createSalesReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        salesOrderId: order.id,
        lines: [{ salesOrderLineId: line.id, quantity: "1" }],
      }),
    ).rejects.toThrow(SalesReturnExceedsFulfilledQuantityError);
  });

  it("lists returns scoped to a company", async () => {
    const ctx = await buildSalesTestContext();
    const { order, line } = await buildFulfilledOrder(ctx, "5");
    await ctx.createSalesReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      salesOrderId: order.id,
      lines: [{ salesOrderLineId: line.id, quantity: "1" }],
    });
    const returns = await ctx.listSalesReturns.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(returns).toHaveLength(1);
  });
});
