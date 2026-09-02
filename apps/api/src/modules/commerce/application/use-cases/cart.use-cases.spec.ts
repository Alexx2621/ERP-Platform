import { buildCommerceTestContext } from "../../test-support/build-commerce-test-context";
import { CartLineNotFoundError, CartNotOpenError, ProductVariantRequiredError, StorefrontProductNotFoundError } from "../errors";

describe("Cart use cases", () => {
  it("GetOrCreateCartUseCase creates a new cart when no cartId is given, and reuses an OPEN one when given", async () => {
    const ctx = await buildCommerceTestContext();
    const created = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    expect(created.status).toBe("OPEN");

    const reused = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: created.id });
    expect(reused.id).toBe(created.id);
  });

  it("GetOrCreateCartUseCase silently creates a fresh cart for an unknown/foreign cartId", async () => {
    const ctx = await buildCommerceTestContext();
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: "does-not-exist" });
    expect(cart.id).not.toBe("does-not-exist");
    expect(cart.status).toBe("OPEN");
  });

  it("AddCartLineUseCase resolves price from the catalog and rejects a caller-supplied price (no such field exists)", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });

    const line = await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "2.0000" });
    expect(line.unitPrice).toBe(ctx.trackedProduct.basePrice);
    expect(line.quantity).toBe("2.0000");
  });

  it("adding the same (product, variant) twice increases quantity on the existing line instead of creating a second one", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });

    await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "1.0000" });
    await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "2.0000" });

    const { lines } = await ctx.getCart.execute({ storefront: ctx.storefront, cartId: cart.id });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe("3.0000");
  });

  it("rejects adding a product that isn't published to this storefront", async () => {
    const ctx = await buildCommerceTestContext();
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    await expect(
      ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "1.0000" }),
    ).rejects.toThrow(StorefrontProductNotFoundError);
  });

  it("requires productVariantId for a hasVariants product", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.variantProduct.id });
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    await expect(
      ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.variantProduct.id, quantity: "1.0000" }),
    ).rejects.toThrow(ProductVariantRequiredError);
  });

  it("UpdateCartLineQuantityUseCase and RemoveCartLineUseCase mutate the right line, scoped to the cart", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    const line = await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "1.0000" });

    const updated = await ctx.updateCartLineQuantity.execute({ storefront: ctx.storefront, cartId: cart.id, cartLineId: line.id, quantity: "9.0000" });
    expect(updated.quantity).toBe("9.0000");

    await ctx.removeCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, cartLineId: line.id });
    const { lines } = await ctx.getCart.execute({ storefront: ctx.storefront, cartId: cart.id });
    expect(lines).toHaveLength(0);
  });

  it("rejects mutating a line once the cart is CONVERTED", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    const line = await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity: "1.0000" });

    cart.convert();
    await ctx.carts.save(cart);

    await expect(
      ctx.updateCartLineQuantity.execute({ storefront: ctx.storefront, cartId: cart.id, cartLineId: line.id, quantity: "2.0000" }),
    ).rejects.toThrow(CartNotOpenError);
  });

  it("throws CartLineNotFoundError for a line belonging to a different cart", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
    const cartA = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    const cartB = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    const lineInA = await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cartA.id, productId: ctx.trackedProduct.id, quantity: "1.0000" });

    await expect(
      ctx.updateCartLineQuantity.execute({ storefront: ctx.storefront, cartId: cartB.id, cartLineId: lineInA.id, quantity: "2.0000" }),
    ).rejects.toThrow(CartLineNotFoundError);
  });
});
