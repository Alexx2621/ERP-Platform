import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import {
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../errors";

describe("ResolvePurchaseLineTargetUseCase", () => {
  it("resolves a tracked product with a warehouse", async () => {
    const ctx = await buildPurchasingTestContext();
    const result = await ctx.resolvePurchaseLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.trackedProduct.id,
      warehouseId: ctx.warehouse.id,
    });
    expect(result.warehouseId).toBe(ctx.warehouse.id);
    expect(result.productVariantId).toBeNull();
    expect(result.defaultUnitCost).toBe(ctx.trackedProduct.baseCost);
  });

  it("requires a warehouseId for a tracked product", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: ctx.trackedProduct.id }),
    ).rejects.toThrow(WarehouseRequiredError);
  });

  it("rejects a warehouseId that does not exist", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.trackedProduct.id,
        warehouseId: "missing",
      }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("never requires a warehouse for an untracked product", async () => {
    const ctx = await buildPurchasingTestContext();
    const result = await ctx.resolvePurchaseLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.untrackedProduct.id,
    });
    expect(result.warehouseId).toBeNull();
  });

  it("rejects a warehouseId provided for an untracked product", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.untrackedProduct.id,
        warehouseId: ctx.warehouse.id,
      }),
    ).rejects.toThrow(WarehouseNotAllowedError);
  });

  it("rejects a product id that does not exist", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: "missing" }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("rejects a product belonging to a different company", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, productId: ctx.otherCompanyProduct.id }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("requires a productVariantId for a hasVariants product", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.variantProduct.id,
      }),
    ).rejects.toThrow(ProductVariantRequiredError);
  });

  it("resolves a variant's own cost as the default unit cost", async () => {
    const ctx = await buildPurchasingTestContext();
    const result = await ctx.resolvePurchaseLineTarget.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.variantProduct.id,
      productVariantId: ctx.variant.id,
      warehouseId: ctx.warehouse.id,
    });
    expect(result.productVariantId).toBe(ctx.variant.id);
    expect(result.defaultUnitCost).toBe(ctx.variant.cost);
  });

  it("rejects a productVariantId for a non-variant product", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.trackedProduct.id,
        productVariantId: "some-variant",
        warehouseId: ctx.warehouse.id,
      }),
    ).rejects.toThrow(ProductVariantNotAllowedError);
  });

  it("rejects a variant that does not belong to the given product", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolvePurchaseLineTarget.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.variantProduct.id,
        productVariantId: "missing-variant",
      }),
    ).rejects.toThrow(ProductVariantNotFoundError);
  });
});
