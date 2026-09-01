import { buildSalesTestContext } from "../../test-support/build-sales-test-context";
import {
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  TaxNotFoundError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../errors";

describe("ResolveSalesLineTargetUseCase", () => {
  it("resolves a tracked product with a warehouse (requireWarehouse defaulting to true)", async () => {
    const ctx = await buildSalesTestContext();
    const result = await ctx.resolveSalesLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
    });
    expect(result.warehouseId).toBe(ctx.warehouse.id);
    expect(result.productVariantId).toBeNull();
    expect(result.defaultUnitPrice).toBe(ctx.trackedProduct.basePrice);
    expect(result.taxRate).toBe("0");
  });

  it("requires a warehouseId for a tracked product when requireWarehouse is true", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: ctx.trackedProduct.id }),
    ).rejects.toThrow(WarehouseRequiredError);
  });

  it("rejects a warehouseId that does not exist", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.trackedProduct.id,
        warehouseId: "missing",
      }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("never requires a warehouse for an untracked product, even with requireWarehouse: true", async () => {
    const ctx = await buildSalesTestContext();
    const result = await ctx.resolveSalesLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.untrackedProduct.id,
    });
    expect(result.warehouseId).toBeNull();
  });

  it("rejects a warehouseId provided for an untracked product", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.untrackedProduct.id,
        warehouseId: ctx.warehouse.id,
      }),
    ).rejects.toThrow(WarehouseNotAllowedError);
  });

  it("skips the warehouse requirement entirely for a tracked product when requireWarehouse is false (Quote lines)", async () => {
    const ctx = await buildSalesTestContext();
    const result = await ctx.resolveSalesLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.trackedProduct.id,
      requireWarehouse: false,
    });
    expect(result.warehouseId).toBeNull();
  });

  it("rejects a product id that does not exist", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: "missing" }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("rejects a product belonging to a different company", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: ctx.otherCompanyProduct.id }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("requires a productVariantId for a hasVariants product", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.variantProduct.id,
        requireWarehouse: false,
      }),
    ).rejects.toThrow(ProductVariantRequiredError);
  });

  it("resolves a variant's own price as the default unit price", async () => {
    const ctx = await buildSalesTestContext();
    const result = await ctx.resolveSalesLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.variantProduct.id,
      productVariantId: ctx.variant.id,
      requireWarehouse: false,
    });
    expect(result.productVariantId).toBe(ctx.variant.id);
    expect(result.defaultUnitPrice).toBe(ctx.variant.price);
  });

  it("rejects a productVariantId for a non-variant product", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.trackedProduct.id,
        productVariantId: "some-variant",
        warehouseId: ctx.warehouse.id,
      }),
    ).rejects.toThrow(ProductVariantNotAllowedError);
  });

  it("rejects a variant that does not belong to the given product", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.variantProduct.id,
        productVariantId: "missing-variant",
        requireWarehouse: false,
      }),
    ).rejects.toThrow(ProductVariantNotFoundError);
  });

  it("resolves a real tax rate when a taxId is provided", async () => {
    const ctx = await buildSalesTestContext();
    const result = await ctx.resolveSalesLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
      taxId: ctx.tax.id,
    });
    expect(result.taxRate).toBe(ctx.tax.rate);
  });

  it("rejects a taxId that does not exist", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveSalesLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.trackedProduct.id,
        warehouseId: ctx.warehouse.id,
        taxId: "missing-tax",
      }),
    ).rejects.toThrow(TaxNotFoundError);
  });
});
