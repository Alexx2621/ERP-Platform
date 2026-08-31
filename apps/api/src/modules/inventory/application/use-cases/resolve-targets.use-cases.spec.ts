import { buildInventoryTestContext } from "../../test-support/build-inventory-test-context";
import {
  ProductInventoryNotTrackedError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  WarehouseNotFoundError,
} from "../errors";

describe("ResolveWarehouseTargetUseCase", () => {
  it("accepts a warehouse that belongs to the company", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(ctx.resolveWarehouse.execute(ctx.tenantId, ctx.companyId, ctx.warehouse1.id)).resolves.toBeUndefined();
  });

  it("rejects an unknown warehouse id", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(ctx.resolveWarehouse.execute(ctx.tenantId, ctx.companyId, "missing")).rejects.toThrow(WarehouseNotFoundError);
  });

  it("rejects a warehouse belonging to a different company (IDOR-resistant)", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveWarehouse.execute(ctx.tenantId, ctx.companyId, ctx.otherCompanyWarehouse.id),
    ).rejects.toThrow(WarehouseNotFoundError);
  });
});

describe("ResolveProductTargetUseCase", () => {
  it("resolves a non-variant product to a null productVariantId", async () => {
    const ctx = await buildInventoryTestContext();
    const result = await ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.trackedProduct.id, undefined);
    expect(result).toBeNull();
  });

  it("rejects a product without inventory tracking enabled", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.untrackedProduct.id, undefined),
    ).rejects.toThrow(ProductInventoryNotTrackedError);
  });

  it("rejects an unknown product id", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, "missing", undefined)).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it("rejects a product belonging to a different company (IDOR-resistant)", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.otherCompanyProduct.id, undefined),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("requires a productVariantId for a hasVariants product", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.variantProduct.id, undefined),
    ).rejects.toThrow(ProductVariantRequiredError);
  });

  it("resolves a hasVariants product with a valid productVariantId", async () => {
    const ctx = await buildInventoryTestContext();
    const result = await ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.variantProduct.id, ctx.variant.id);
    expect(result).toBe(ctx.variant.id);
  });

  it("rejects a variant that does not belong to the given product", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.trackedProduct.id, ctx.variant.id),
    ).rejects.toThrow(ProductVariantNotAllowedError);
  });

  it("rejects an unknown productVariantId", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.variantProduct.id, "missing"),
    ).rejects.toThrow(ProductVariantNotFoundError);
  });

  it("rejects a productVariantId for a product without variants", async () => {
    const ctx = await buildInventoryTestContext();
    await expect(
      ctx.resolveProduct.execute(ctx.tenantId, ctx.companyId, ctx.trackedProduct.id, "some-variant"),
    ).rejects.toThrow(ProductVariantNotAllowedError);
  });
});
