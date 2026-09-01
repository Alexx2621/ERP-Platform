import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import {
  PurchaseOrderHasNoLinesError,
  PurchaseOrderHasReceiptsError,
  PurchaseOrderNotCancellableError,
  PurchaseOrderNotConfirmedError,
  PurchaseOrderNotDraftError,
  PurchaseOrderNotFoundError,
} from "../errors";

describe("PurchaseOrder lifecycle use cases", () => {
  it("creates a DRAFT order for a valid supplier", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "usd" });
    expect(order.status).toBe("DRAFT");
    expect(order.currency).toBe("USD");
  });

  it("adds a line requiring a warehouse for a tracked product, defaulting unitCost from the product", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const line = await ctx.addPurchaseOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      purchaseOrderId: order.id,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
      quantity: "10",
    });
    expect(line.warehouseId).toBe(ctx.warehouse.id);
    expect(line.unitCost).toBe(ctx.trackedProduct.baseCost);
    expect(line.lineTotal).toBe("40.0000");
  });

  it("rejects adding a line to a non-DRAFT order", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    await ctx.cancelPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
    await expect(
      ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.untrackedProduct.id, quantity: "1" }),
    ).rejects.toThrow(PurchaseOrderNotDraftError);
  });

  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildPurchasingTestContext();
    const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    await expect(
      ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, purchaseOrderId: order.id }),
    ).rejects.toThrow(PurchaseOrderNotFoundError);
  });

  describe("ConfirmPurchaseOrderUseCase", () => {
    it("rejects confirming an order with no lines", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await expect(
        ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id }),
      ).rejects.toThrow(PurchaseOrderHasNoLinesError);
    });

    it("confirms an order with at least one line, without touching inventory", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });

      const confirmed = await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      expect(confirmed.status).toBe("CONFIRMED");
      expect(ctx.balances.items).toHaveLength(0);
    });

    it("rejects re-confirming an already-CONFIRMED order", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
      await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      await expect(
        ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id }),
      ).rejects.toThrow(PurchaseOrderNotDraftError);
    });
  });

  describe("ClosePurchaseOrderUseCase", () => {
    it("closes a CONFIRMED order even with nothing received yet", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
      await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });

      const closed = await ctx.closePurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      expect(closed.status).toBe("CLOSED");
    });

    it("rejects closing a DRAFT order", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await expect(
        ctx.closePurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id }),
      ).rejects.toThrow(PurchaseOrderNotConfirmedError);
    });
  });

  describe("CancelPurchaseOrderUseCase", () => {
    it("cancels a DRAFT order", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      const cancelled = await ctx.cancelPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("cancels a CONFIRMED order with no receipts yet", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
      await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      const cancelled = await ctx.cancelPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("rejects cancelling a CONFIRMED order that already has a receipt — goods that physically arrived cannot be un-arrived by cancelling the paperwork", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      const line = await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
      await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      await ctx.createPurchaseReceipt.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        purchaseOrderId: order.id,
        lines: [{ purchaseOrderLineId: line.id, quantity: "3" }],
      });

      await expect(
        ctx.cancelPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id }),
      ).rejects.toThrow(PurchaseOrderHasReceiptsError);
    });

    it("rejects cancelling a CLOSED order", async () => {
      const ctx = await buildPurchasingTestContext();
      const order = await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
      await ctx.addPurchaseOrderLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id, productId: ctx.trackedProduct.id, warehouseId: ctx.warehouse.id, quantity: "10" });
      await ctx.confirmPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });
      await ctx.closePurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id });

      await expect(
        ctx.cancelPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, purchaseOrderId: order.id }),
      ).rejects.toThrow(PurchaseOrderNotCancellableError);
    });
  });

  it("lists purchase orders scoped to a company", async () => {
    const ctx = await buildPurchasingTestContext();
    await ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: ctx.supplier.id, currency: "USD" });
    const list = await ctx.listPurchaseOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(list).toHaveLength(1);
  });
});
