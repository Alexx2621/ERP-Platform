import { buildManufacturingTestContext } from "../../test-support/build-manufacturing-test-context";
import {
  BillOfMaterialNotActiveError,
  BillOfMaterialNotFoundError,
  ProductionOrderHasActivityError,
  ProductionOrderNotCancellableError,
  ProductionOrderNotConfirmedError,
  ProductionOrderNotDraftError,
  ProductionOrderNotFoundError,
} from "../errors";

async function buildActiveBom(ctx: Awaited<ReturnType<typeof buildManufacturingTestContext>>) {
  return ctx.createBillOfMaterial.execute({
    tenantId: ctx.tenantId,
    companyId: ctx.companyId,
    productId: ctx.finishedGood.id,
    code: "BOM-CHAIR",
    name: "Silla de madera",
    components: [
      { componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" },
      { componentProductId: ctx.componentB.id, quantityPerUnit: "8.0000" },
    ],
  });
}

describe("ProductionOrder lifecycle use cases", () => {
  it("creates a DRAFT order and snapshots material requirements scaled by quantityPlanned", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);

    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    expect(order.status).toBe("DRAFT");
    expect(order.productId).toBe(ctx.finishedGood.id);

    const materials = await ctx.listProductionOrderMaterials.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productionOrderId: order.id,
    });
    expect(materials).toHaveLength(2);
    const componentAMaterial = materials.find((m) => m.material.componentProductId === ctx.componentA.id);
    const componentBMaterial = materials.find((m) => m.material.componentProductId === ctx.componentB.id);
    expect(componentAMaterial?.material.quantityRequired).toBe("10.0000"); // 2 × 5
    expect(componentBMaterial?.material.quantityRequired).toBe("40.0000"); // 8 × 5
  });

  it("rejects creating an order against an INACTIVE bill of material", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    await ctx.setBillOfMaterialStatus.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      status: "INACTIVE",
    });
    await expect(
      ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      }),
    ).rejects.toThrow(BillOfMaterialNotActiveError);
  });

  it("rejects creating an order against a bill of material from another company", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    await expect(
      ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.otherCompanyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      }),
    ).rejects.toThrow(BillOfMaterialNotFoundError);
  });

  it("confirms a DRAFT order", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    const confirmed = await ctx.confirmProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productionOrderId: order.id,
    });
    expect(confirmed.status).toBe("CONFIRMED");
  });

  it("rejects re-confirming an already-CONFIRMED order", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    await expect(
      ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id }),
    ).rejects.toThrow(ProductionOrderNotDraftError);
  });

  it("rejects operating on an order from a different company", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    await expect(
      ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, productionOrderId: order.id }),
    ).rejects.toThrow(ProductionOrderNotFoundError);
  });

  it("closes a CONFIRMED order even with nothing issued or received yet", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    const closed = await ctx.closeProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    expect(closed.status).toBe("CLOSED");
  });

  it("rejects closing a DRAFT order", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    await expect(
      ctx.closeProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id }),
    ).rejects.toThrow(ProductionOrderNotConfirmedError);
  });

  describe("CancelProductionOrderUseCase", () => {
    it("cancels a DRAFT order", async () => {
      const ctx = await buildManufacturingTestContext();
      const bom = await buildActiveBom(ctx);
      const order = await ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      });
      const cancelled = await ctx.cancelProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("cancels a CONFIRMED order with no real activity yet", async () => {
      const ctx = await buildManufacturingTestContext();
      const bom = await buildActiveBom(ctx);
      const order = await ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      });
      await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      const cancelled = await ctx.cancelProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("rejects cancelling an order that already has a real material issue", async () => {
      const ctx = await buildManufacturingTestContext();
      const bom = await buildActiveBom(ctx);
      const order = await ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      });
      await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      await ctx.recordReceipt.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        warehouseId: ctx.warehouse.id,
        productId: ctx.componentA.id,
        quantity: "100.0000",
      });
      const materials = await ctx.listProductionOrderMaterials.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      const componentAMaterial = materials.find((m) => m.material.componentProductId === ctx.componentA.id)!;
      await ctx.issueProductionOrderMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        productionOrderId: order.id,
        productionOrderMaterialId: componentAMaterial.material.id,
        quantity: "1.0000",
      });

      await expect(
        ctx.cancelProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id }),
      ).rejects.toThrow(ProductionOrderHasActivityError);
    });

    it("rejects cancelling a CLOSED order", async () => {
      const ctx = await buildManufacturingTestContext();
      const bom = await buildActiveBom(ctx);
      const order = await ctx.createProductionOrder.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        billOfMaterialId: bom.id,
        warehouseId: ctx.warehouse.id,
        quantityPlanned: "5.0000",
      });
      await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      await ctx.closeProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
      await expect(
        ctx.cancelProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id }),
      ).rejects.toThrow(ProductionOrderNotCancellableError);
    });
  });

  it("computes quantityCompleted fresh from finished-goods receipts, never a stored counter", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    await ctx.recordFinishedGoods.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      quantity: "2.0000",
    });
    const result = await ctx.getProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    expect(result.quantityCompleted).toBe("2.0000");
  });

  it("lists production orders scoped to a company", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await buildActiveBom(ctx);
    await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    const list = await ctx.listProductionOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: {} });
    expect(list).toHaveLength(1);
  });
});
