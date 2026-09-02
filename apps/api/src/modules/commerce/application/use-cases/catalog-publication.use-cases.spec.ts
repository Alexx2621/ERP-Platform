import { buildCommerceTestContext } from "../../test-support/build-commerce-test-context";
import { StorefrontNotActiveError, StorefrontProductNotFoundError } from "../errors";

describe("Catalog publication use cases", () => {
  it("publishes a product and it becomes visible in the public listing", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });

    const summaries = await ctx.listPublishedProducts.execute({ storefrontCode: ctx.storefront.code, limit: 50 });
    expect(summaries.map((s) => s.productId)).toContain(ctx.trackedProduct.id);
    expect(summaries.find((s) => s.productId === ctx.trackedProduct.id)?.basePrice).toBe(ctx.trackedProduct.basePrice);
  });

  it("publishing twice is idempotent — a single admin listing row, refreshed", async () => {
    const ctx = await buildCommerceTestContext();
    const first = await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const second = await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    expect(second.id).toBe(first.id);

    const admin = await ctx.listStorefrontProducts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, filter: { limit: 50 } });
    expect(admin.filter((row) => row.publication.productId === ctx.trackedProduct.id)).toHaveLength(1);
  });

  it("unpublishing removes it from the public listing but not from the admin one", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    await ctx.unpublishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });

    const publicList = await ctx.listPublishedProducts.execute({ storefrontCode: ctx.storefront.code, limit: 50 });
    expect(publicList.map((s) => s.productId)).not.toContain(ctx.trackedProduct.id);

    const admin = await ctx.listStorefrontProducts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, filter: { limit: 50 } });
    expect(admin.map((row) => row.publication.productId)).toContain(ctx.trackedProduct.id);
  });

  it("unpublishing something never published throws", async () => {
    const ctx = await buildCommerceTestContext();
    await expect(
      ctx.unpublishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id }),
    ).rejects.toThrow(StorefrontProductNotFoundError);
  });

  it("the public listing rejects an INACTIVE storefront", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.setStorefrontStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.storefront.id, status: "INACTIVE" });
    await expect(ctx.listPublishedProducts.execute({ storefrontCode: ctx.storefront.code, limit: 50 })).rejects.toThrow(StorefrontNotActiveError);
  });

  it("GetPublishedProductUseCase includes variants for a hasVariants product", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.variantProduct.id });

    const detail = await ctx.getPublishedProduct.execute({ storefrontCode: ctx.storefront.code, productId: ctx.variantProduct.id });
    expect(detail.product.id).toBe(ctx.variantProduct.id);
    expect(detail.variants.map((v) => v.id)).toContain(ctx.variant.id);
  });

  it("GetPublishedProductUseCase rejects a product that isn't published to this storefront", async () => {
    const ctx = await buildCommerceTestContext();
    await expect(ctx.getPublishedProduct.execute({ storefrontCode: ctx.storefront.code, productId: ctx.trackedProduct.id })).rejects.toThrow(
      StorefrontProductNotFoundError,
    );
  });
});
