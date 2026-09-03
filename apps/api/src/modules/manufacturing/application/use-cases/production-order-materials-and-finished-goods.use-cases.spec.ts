import { buildManufacturingTestContext } from "../../test-support/build-manufacturing-test-context";
import {
  ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError,
  ProductionOrderMaterialIssueExceedsRequiredQuantityError,
  ProductionOrderMaterialReturnExceedsIssuedQuantityError,
  ProductionOrderNotConfirmedError,
} from "../errors";

async function buildConfirmedOrder(ctx: Awaited<ReturnType<typeof buildManufacturingTestContext>>, quantityPlanned = "5.0000") {
  const bom = await ctx.createBillOfMaterial.execute({
    tenantId: ctx.tenantId,
    companyId: ctx.companyId,
    productId: ctx.finishedGood.id,
    code: "BOM-CHAIR",
    name: "Silla de madera",
    components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
  });
  const order = await ctx.createProductionOrder.execute({
    tenantId: ctx.tenantId,
    companyId: ctx.companyId,
    billOfMaterialId: bom.id,
    warehouseId: ctx.warehouse.id,
    quantityPlanned,
  });
  await ctx.confirmProductionOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
  // Seed 100 real units of the component into the warehouse, via the same real Inventory receipt path this module itself calls.
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
  return { order, material: materials[0].material };
}

describe("Material issue/return use cases", () => {
  it("issues a real quantity, moving it through the real Inventory ledger", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order, material } = await buildConfirmedOrder(ctx);

    const movement = await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "4.0000",
    });
    expect(movement.type).toBe("ISSUE");

    const balance = ctx.balances.items.find((b) => b.productId === ctx.componentA.id)!;
    expect(balance.onHandQuantity).toBe("96.0000"); // 100 - 4
  });

  it("supports genuinely partial issues across multiple calls", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order, material } = await buildConfirmedOrder(ctx); // quantityRequired = 2 × 5 = 10

    await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "6.0000",
    });
    await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "4.0000",
    });

    const summaries = await ctx.listProductionOrderMaterials.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    expect(summaries[0].quantityIssuedNet).toBe("10.0000");
  });

  it("rejects an issue that would exceed the material's own required quantity", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order, material } = await buildConfirmedOrder(ctx); // required = 10
    await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "9.0000",
    });
    await expect(
      ctx.issueProductionOrderMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        productionOrderId: order.id,
        productionOrderMaterialId: material.id,
        quantity: "2.0000",
      }),
    ).rejects.toThrow(ProductionOrderMaterialIssueExceedsRequiredQuantityError);
  });

  it("rejects issuing against a DRAFT (not yet confirmed) order", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    const order = await ctx.createProductionOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      warehouseId: ctx.warehouse.id,
      quantityPlanned: "5.0000",
    });
    const materials = await ctx.listProductionOrderMaterials.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    await expect(
      ctx.issueProductionOrderMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        productionOrderId: order.id,
        productionOrderMaterialId: materials[0].material.id,
        quantity: "1.0000",
      }),
    ).rejects.toThrow(ProductionOrderNotConfirmedError);
  });

  it("returns unused material back to stock, moving it through the real Inventory ledger", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order, material } = await buildConfirmedOrder(ctx);
    await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "8.0000",
    });

    const movement = await ctx.returnProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "3.0000",
    });
    expect(movement.type).toBe("RETURN");

    const balance = ctx.balances.items.find((b) => b.productId === ctx.componentA.id)!;
    expect(balance.onHandQuantity).toBe("95.0000"); // 100 - 8 + 3

    const summaries = await ctx.listProductionOrderMaterials.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    expect(summaries[0].quantityIssuedNet).toBe("5.0000"); // 8 - 3
  });

  it("rejects a return that would exceed the net issued quantity", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order, material } = await buildConfirmedOrder(ctx);
    await ctx.issueProductionOrderMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      productionOrderMaterialId: material.id,
      quantity: "2.0000",
    });
    await expect(
      ctx.returnProductionOrderMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        productionOrderId: order.id,
        productionOrderMaterialId: material.id,
        quantity: "3.0000",
      }),
    ).rejects.toThrow(ProductionOrderMaterialReturnExceedsIssuedQuantityError);
  });
});

describe("RecordFinishedGoodsUseCase", () => {
  it("records a real, genuinely partial receipt of finished goods", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order } = await buildConfirmedOrder(ctx);

    await ctx.recordFinishedGoods.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      quantity: "3.0000",
    });
    await ctx.recordFinishedGoods.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      quantity: "2.0000",
    });

    const balance = ctx.balances.items.find((b) => b.productId === ctx.finishedGood.id)!;
    expect(balance.onHandQuantity).toBe("5.0000");

    const receipts = await ctx.listProductionOrderFinishedGoodsReceipts.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productionOrderId: order.id,
    });
    expect(receipts).toHaveLength(2);
  });

  it("rejects a receipt that would exceed the order's own quantityPlanned", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order } = await buildConfirmedOrder(ctx, "5.0000");
    await ctx.recordFinishedGoods.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      productionOrderId: order.id,
      quantity: "4.0000",
    });
    await expect(
      ctx.recordFinishedGoods.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        productionOrderId: order.id,
        quantity: "2.0000",
      }),
    ).rejects.toThrow(ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError);
  });
});

describe("Production order operations use cases", () => {
  it("appends operations in order and completes them one-way", async () => {
    const ctx = await buildManufacturingTestContext();
    const { order } = await buildConfirmedOrder(ctx);

    const first = await ctx.addProductionOrderOperation.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id, name: "Corte" });
    const second = await ctx.addProductionOrderOperation.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id, name: "Ensamblaje" });
    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);

    const completed = await ctx.completeProductionOrderOperation.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productionOrderId: order.id,
      operationId: first.id,
    });
    expect(completed.completedAt).not.toBeNull();

    const operations = await ctx.listProductionOrderOperations.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productionOrderId: order.id });
    expect(operations.map((o) => o.name)).toEqual(["Corte", "Ensamblaje"]);
  });
});
