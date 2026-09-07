import { buildSalesTestContext, type SalesTestContext } from "../../test-support/build-sales-test-context";

describe("GetTopSellingProductsUseCase", () => {
  let ctx: SalesTestContext;

  beforeEach(async () => {
    ctx = await buildSalesTestContext();
  });

  it("ranks products by revenue over the given window, highest first", async () => {
    await ctx.receiveStock("10");

    // trackedProduct: 4 units @ 10.0000 = 40.0000
    const orderA = await ctx.createSalesOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      customerId: ctx.customer.id,
      currency: "USD",
    });
    await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: orderA.id,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
      quantity: "4",
    });

    // untrackedProduct: 1 unit @ 50.0000 = 50.0000 — higher revenue despite lower quantity.
    const orderB = await ctx.createSalesOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      customerId: ctx.customer.id,
      currency: "USD",
    });
    await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: orderB.id,
      productId: ctx.untrackedProduct.id,
      quantity: "1",
    });

    const results = await ctx.getTopSellingProducts.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      sinceDays: 30,
      limit: 5,
    });

    expect(results).toEqual([
      expect.objectContaining({ productId: ctx.untrackedProduct.id, revenue: "50.0000", quantity: "1.0000" }),
      expect.objectContaining({ productId: ctx.trackedProduct.id, revenue: "40.0000", quantity: "4.0000" }),
    ]);
    expect(results[0]?.productCode).toBe(ctx.untrackedProduct.code);
    expect(results[0]?.productName).toBe(ctx.untrackedProduct.name);
  });

  it("excludes cancelled orders from the ranking", async () => {
    const order = await ctx.createSalesOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      customerId: ctx.customer.id,
      currency: "USD",
    });
    await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: order.id,
      productId: ctx.untrackedProduct.id,
      quantity: "2",
    });
    await ctx.cancelSalesOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      salesOrderId: order.id,
    });

    const results = await ctx.getTopSellingProducts.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      sinceDays: 30,
      limit: 5,
    });

    expect(results).toEqual([]);
  });

  it("returns an empty ranking when there is nothing to rank", async () => {
    const results = await ctx.getTopSellingProducts.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      sinceDays: 30,
      limit: 5,
    });

    expect(results).toEqual([]);
  });

  it("respects the requested limit", async () => {
    const order = await ctx.createSalesOrder.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      customerId: ctx.customer.id,
      currency: "USD",
    });
    await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: order.id,
      productId: ctx.untrackedProduct.id,
      quantity: "1",
    });
    await ctx.receiveStock("10");
    await ctx.addSalesOrderLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: order.id,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
      quantity: "1",
    });

    const results = await ctx.getTopSellingProducts.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      sinceDays: 30,
      limit: 1,
    });

    expect(results).toHaveLength(1);
  });
});
