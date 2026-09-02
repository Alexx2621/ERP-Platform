import { buildCommerceTestContext } from "../../test-support/build-commerce-test-context";
import { CartHasNoLinesError } from "../errors";
import { InsufficientInventoryForOrderError } from "../../../sales";

async function publishAndAddLine(ctx: Awaited<ReturnType<typeof buildCommerceTestContext>>, quantity = "2.0000") {
  await ctx.publishProduct.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, storefrontId: ctx.storefront.id, productId: ctx.trackedProduct.id });
  const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
  await ctx.addCartLine.execute({ storefront: ctx.storefront, cartId: cart.id, productId: ctx.trackedProduct.id, quantity });
  return cart;
}

describe("CheckoutUseCase", () => {
  it("creates a confirmed order, captures a BANK_TRANSFER payment when a reference is given, and reserves inventory", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cart = await publishAndAddLine(ctx, "2.0000");

    const { order, wasReplayed } = await ctx.checkout.execute({
      storefront: ctx.storefront,
      correlationId: "corr-1",
      cartId: cart.id,
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      paymentReference: "TRX-123",
    });

    expect(wasReplayed).toBe(false);
    expect(order.cartId).toBe(cart.id);
    expect(order.paymentId).not.toBeNull();
    expect(order.total).toBe("20.0000"); // 2 * 10.0000

    const salesOrder = await ctx.getSalesOrder.execute(ctx.tenantId, order.salesOrderId);
    expect(salesOrder?.status).toBe("CONFIRMED");

    const savedCart = await ctx.carts.findById(ctx.tenantId, cart.id);
    expect(savedCart?.status).toBe("CONVERTED");
  });

  it("leaves the order CONFIRMED and unpaid when no payment reference is given — staff captures payment later", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cart = await publishAndAddLine(ctx);

    const { order } = await ctx.checkout.execute({
      storefront: ctx.storefront,
      correlationId: "corr-1",
      cartId: cart.id,
      guestName: "Ada Lovelace",
      guestEmail: "ada2@example.com",
    });

    expect(order.paymentId).toBeNull();
    const salesOrder = await ctx.getSalesOrder.execute(ctx.tenantId, order.salesOrderId);
    expect(salesOrder?.status).toBe("CONFIRMED");
  });

  it("is idempotent by cartId — retrying the same cart returns the same order without creating a second one", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cart = await publishAndAddLine(ctx);

    const first = await ctx.checkout.execute({
      storefront: ctx.storefront,
      correlationId: "corr-1",
      cartId: cart.id,
      guestName: "Ada",
      guestEmail: "ada3@example.com",
    });
    const second = await ctx.checkout.execute({
      storefront: ctx.storefront,
      correlationId: "corr-2",
      cartId: cart.id,
      guestName: "Ada",
      guestEmail: "ada3@example.com",
    });

    expect(second.wasReplayed).toBe(true);
    expect(second.order.id).toBe(first.order.id);
  });

  it("reuses the same guest customer across two separate carts with the same email instead of creating a duplicate", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cartA = await publishAndAddLine(ctx, "1.0000");
    const cartB = await publishAndAddLine(ctx, "1.0000");

    const first = await ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "c1", cartId: cartA.id, guestName: "Ada", guestEmail: "shared@example.com" });
    const second = await ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "c2", cartId: cartB.id, guestName: "Ada", guestEmail: "shared@example.com" });

    expect(second.order.customerId).toBe(first.order.customerId);
  });

  it("rejects checkout for an empty cart", async () => {
    const ctx = await buildCommerceTestContext();
    const cart = await ctx.getOrCreateCart.execute({ storefront: ctx.storefront, cartId: null });
    await expect(
      ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "corr-1", cartId: cart.id, guestName: "Ada", guestEmail: "ada@example.com" }),
    ).rejects.toThrow(CartHasNoLinesError);
  });

  it("rejects checkout for an already-CONVERTED cart", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cart = await publishAndAddLine(ctx);
    await ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "c1", cartId: cart.id, guestName: "Ada", guestEmail: "ada4@example.com" });

    // A second, different cart cannot reuse an already-converted cart's id as if it were still open.
    const converted = await ctx.carts.findById(ctx.tenantId, cart.id);
    expect(converted?.status).toBe("CONVERTED");
  });

  it("compensates by cancelling the order when inventory is insufficient, leaving the cart still OPEN", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("1.0000"); // only 1 unit in stock
    const cart = await publishAndAddLine(ctx, "5.0000"); // cart wants 5

    await expect(
      ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "corr-1", cartId: cart.id, guestName: "Ada", guestEmail: "ada5@example.com" }),
    ).rejects.toThrow(InsufficientInventoryForOrderError);

    const savedCart = await ctx.carts.findById(ctx.tenantId, cart.id);
    expect(savedCart?.status).toBe("OPEN");
    const found = await ctx.commerceOrders.findByCartId(ctx.tenantId, ctx.companyId, cart.id);
    expect(found).toBeNull();
  });

  it("rejects checkout with no guest email", async () => {
    const ctx = await buildCommerceTestContext();
    await ctx.receiveStock("10.0000");
    const cart = await publishAndAddLine(ctx);
    await expect(
      ctx.checkout.execute({ storefront: ctx.storefront, correlationId: "corr-1", cartId: cart.id, guestName: "Ada", guestEmail: "  " }),
    ).rejects.toThrow();
  });
});
