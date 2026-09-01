import { buildSalesTestContext } from "../../test-support/build-sales-test-context";
import {
  InsufficientInventoryForOrderError,
  SalesOrderHasNoLinesError,
  SalesOrderNotCancellableError,
  SalesOrderNotConfirmedError,
  SalesOrderNotDraftError,
  SalesOrderNotFoundError,
} from "../errors";

describe("SalesOrder lifecycle use cases", () => {
  it("creates a DRAFT order with no quoteId for a valid customer", async () => {
    const ctx = await buildSalesTestContext();
    const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "usd" });
    expect(order.status).toBe("DRAFT");
    expect(order.quoteId).toBeNull();
    expect(order.currency).toBe("USD");
  });

  it("adds a line requiring a warehouse for a tracked product", async () => {
    const ctx = await buildSalesTestContext();
    const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const line = await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: order.id,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
      quantity: "3",
    });
    expect(line.warehouseId).toBe(ctx.warehouse.id);
    expect(line.lineTotal).toBe("30.0000");
  });

  it("rejects adding a line to a non-DRAFT order", async () => {
    const ctx = await buildSalesTestContext();
    const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await ctx.cancelSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
    await expect(
      ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.untrackedProduct.id, quantity: "1" }),
    ).rejects.toThrow(SalesOrderNotDraftError);
  });

  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildSalesTestContext();
    const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await expect(
      ctx.getSalesOrder.execute(ctx.tenantId, order.id).then(async (found) => {
        expect(found).not.toBeNull();
        return ctx.confirmSalesOrder.execute({
          tenantId: ctx.tenantId,
          companyId: ctx.otherCompanyId,
          actorUserId: ctx.actorUserId,
          correlationId: ctx.correlationId,
          salesOrderId: order.id,
        });
      }),
    ).rejects.toThrow(SalesOrderNotFoundError);
  });

  describe("ConfirmSalesOrderUseCase", () => {
    it("rejects confirming an order with no lines", async () => {
      const ctx = await buildSalesTestContext();
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await expect(
        ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(SalesOrderHasNoLinesError);
    });

    it("reserves inventory for every tracked-inventory line and skips lines with no warehouse", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "4" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.untrackedProduct.id, quantity: "1" });

      const confirmed = await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      expect(confirmed.status).toBe("CONFIRMED");

      const lines = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id });
      const trackedLine = lines.find((l) => l.productId === ctx.trackedProduct.id)!;
      const untrackedLine = lines.find((l) => l.productId === ctx.untrackedProduct.id)!;
      expect(trackedLine.reservationId).not.toBeNull();
      expect(untrackedLine.reservationId).toBeNull();

      const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
      expect(balance.onHandQuantity).toBe("10.0000");
      expect(balance.reservedQuantity).toBe("4.0000");
      expect(balance.availableQuantity).toBe("6.0000");
    });

    it("rejects re-confirming an already-CONFIRMED order", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "1" });
      await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      await expect(
        ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(SalesOrderNotDraftError);
    });

    it("compensates: when a later line's reservation fails for insufficient stock, every reservation already made for this attempt is released and the order stays DRAFT", async () => {
      const ctx = await buildSalesTestContext();
      // Only 3 on hand — the first line (quantity 3) will succeed and reserve
      // everything available; the second line (quantity 5) must then fail.
      await ctx.receiveStock("3");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "3" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "5" });

      await expect(
        ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(InsufficientInventoryForOrderError);

      // The order was never confirmed.
      const reloaded = await ctx.getSalesOrder.execute(ctx.tenantId, order.id);
      expect(reloaded!.status).toBe("DRAFT");

      // No line kept a reservation attached — the first line's reservation was
      // released again as part of the compensation.
      const lines = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id });
      for (const line of lines) {
        expect(line.reservationId).toBeNull();
      }

      // The balance is back to fully available — the failed confirm left no
      // stock reserved behind.
      const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
      expect(balance.onHandQuantity).toBe("3.0000");
      expect(balance.reservedQuantity).toBe("0.0000");
      expect(balance.availableQuantity).toBe("3.0000");

      // A subsequent confirm attempt with achievable quantities succeeds cleanly.
      const order2 = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order2.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "3" });
      const confirmed2 = await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order2.id });
      expect(confirmed2.status).toBe("CONFIRMED");
    });
  });

  describe("CancelSalesOrderUseCase", () => {
    it("cancels a DRAFT order with no reservations to release", async () => {
      const ctx = await buildSalesTestContext();
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      const cancelled = await ctx.cancelSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("releases every attached reservation when cancelling a CONFIRMED order", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "4" });
      await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });

      const cancelled = await ctx.cancelSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");

      const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
      expect(balance.onHandQuantity).toBe("10.0000");
      expect(balance.reservedQuantity).toBe("0.0000");
    });

    it("rejects cancelling a FULFILLED order — corrected via a return, not a cancellation", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "4" });
      await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      await ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });

      await expect(
        ctx.cancelSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(SalesOrderNotCancellableError);
    });
  });

  describe("FulfillSalesOrderUseCase", () => {
    it("rejects fulfilling a DRAFT order", async () => {
      const ctx = await buildSalesTestContext();
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await expect(
        ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(SalesOrderNotConfirmedError);
    });

    it("releases the reservation and issues real stock, leaving on-hand and reserved both reduced by the same amount (available unchanged)", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "4" });
      await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });

      const balanceBefore = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
      expect(balanceBefore.availableQuantity).toBe("6.0000");

      const fulfilled = await ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      expect(fulfilled.status).toBe("FULFILLED");

      const balanceAfter = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
      expect(balanceAfter.onHandQuantity).toBe("6.0000");
      expect(balanceAfter.reservedQuantity).toBe("0.0000");
      expect(balanceAfter.availableQuantity).toBe("6.0000");
    });

    it("rejects re-fulfilling an already-FULFILLED order", async () => {
      const ctx = await buildSalesTestContext();
      await ctx.receiveStock("10");
      const order = await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addSalesOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "4" });
      await ctx.confirmSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      await ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id });
      await expect(
        ctx.fulfillSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, correlationId: ctx.correlationId, salesOrderId: order.id }),
      ).rejects.toThrow(SalesOrderNotConfirmedError);
    });
  });

  it("lists sales orders scoped to a company", async () => {
    const ctx = await buildSalesTestContext();
    await ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const list = await ctx.listSalesOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(list).toHaveLength(1);
  });
});
