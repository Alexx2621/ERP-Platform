import { buildSalesTestContext } from "../../test-support/build-sales-test-context";
import {
  QuoteHasNoLinesError,
  QuoteNotDraftError,
  QuoteNotFoundError,
  ProductVariantNotFoundError,
} from "../errors";

describe("Quote lifecycle use cases", () => {
  it("creates a DRAFT quote for a valid customer", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "usd" });
    expect(quote.status).toBe("DRAFT");
    expect(quote.currency).toBe("USD");
    expect(quote.channel).toBe("ERP");
  });

  it("defaults the channel to ERP but honors an explicit one", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      customerId: ctx.customer.id,
      currency: "USD",
      channel: "POS",
    });
    expect(quote.channel).toBe("POS");
  });

  it("adds a line to a DRAFT quote, resolving the product's own base price and never requiring a warehouse", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const line = await ctx.addQuoteLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      quoteId: quote.id,
      productId: ctx.trackedProduct.id,
      quantity: "2",
    });
    expect(line.unitPrice).toBe(ctx.trackedProduct.basePrice);
    expect(line.lineTotal).toBe("20.0000");
  });

  it("an explicit unitPrice overrides both the price list and the product's own base price", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const line = await ctx.addQuoteLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      quoteId: quote.id,
      productId: ctx.trackedProduct.id,
      priceListId: ctx.priceList.id,
      quantity: "1",
      unitPrice: "7.5000",
    });
    expect(line.unitPrice).toBe("7.5000");
  });

  it("falls back to a price-list snapshot when no explicit unitPrice is given, for a non-variant product", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const line = await ctx.addQuoteLine.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      quoteId: quote.id,
      productId: ctx.trackedProduct.id,
      priceListId: ctx.priceList.id,
      quantity: "1",
    });
    expect(line.unitPrice).toBe("8.0000");
  });

  it("rejects adding a line to a non-DRAFT quote", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await ctx.cancelQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id });
    await expect(
      ctx.addQuoteLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id, productId: ctx.trackedProduct.id, quantity: "1" }),
    ).rejects.toThrow(QuoteNotDraftError);
  });

  it("rejects adding a line for a variant that does not exist", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await expect(
      ctx.addQuoteLine.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        quoteId: quote.id,
        productId: ctx.variantProduct.id,
        productVariantId: "missing",
        quantity: "1",
      }),
    ).rejects.toThrow(ProductVariantNotFoundError);
  });

  it("rejects operating on a quote from a different company", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await expect(ctx.cancelQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, quoteId: quote.id })).rejects.toThrow(
      QuoteNotFoundError,
    );
  });

  it("cancels a DRAFT quote", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const cancelled = await ctx.cancelQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id });
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("lists quotes scoped to a company", async () => {
    const ctx = await buildSalesTestContext();
    await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    const list = await ctx.listQuotes.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(list).toHaveLength(1);
  });

  it("lists a quote's lines", async () => {
    const ctx = await buildSalesTestContext();
    const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
    await ctx.addQuoteLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id, productId: ctx.trackedProduct.id, quantity: "1" });
    const lines = await ctx.listQuoteLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id });
    expect(lines).toHaveLength(1);
  });

  describe("ConvertQuoteToSalesOrderUseCase", () => {
    it("rejects converting a quote with no lines", async () => {
      const ctx = await buildSalesTestContext();
      const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await expect(ctx.convertQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id })).rejects.toThrow(
        QuoteHasNoLinesError,
      );
    });

    it("rejects converting a non-DRAFT quote", async () => {
      const ctx = await buildSalesTestContext();
      const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      await ctx.addQuoteLine.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id, productId: ctx.trackedProduct.id, quantity: "1" });
      await ctx.cancelQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id });
      await expect(ctx.convertQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id })).rejects.toThrow(
        QuoteNotDraftError,
      );
    });

    it("copies every line's pricing snapshot verbatim, applies the given warehouse only to tracked-inventory lines, and marks the quote CONVERTED", async () => {
      const ctx = await buildSalesTestContext();
      const quote = await ctx.createQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: ctx.customer.id, currency: "USD" });
      const trackedLine = await ctx.addQuoteLine.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        quoteId: quote.id,
        productId: ctx.trackedProduct.id,
        quantity: "2",
        discountAmount: "1",
      });
      const untrackedLine = await ctx.addQuoteLine.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        quoteId: quote.id,
        productId: ctx.untrackedProduct.id,
        quantity: "1",
      });

      const order = await ctx.convertQuote.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, quoteId: quote.id, warehouseId: ctx.warehouse.id });
      expect(order.status).toBe("DRAFT");
      expect(order.quoteId).toBe(quote.id);
      expect(order.customerId).toBe(quote.customerId);

      const orderLines = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: order.id });
      const convertedTracked = orderLines.find((l) => l.productId === ctx.trackedProduct.id)!;
      const convertedUntracked = orderLines.find((l) => l.productId === ctx.untrackedProduct.id)!;

      // The tracked-inventory line gets the given warehouse...
      expect(convertedTracked.warehouseId).toBe(ctx.warehouse.id);
      expect(convertedTracked.lineTotal).toBe(trackedLine.lineTotal);

      // ...but the untracked line NEVER gets a warehouseId, even though one was
      // provided for the whole conversion — this is the fix for the bug where
      // ConvertQuoteToSalesOrderUseCase used to assign warehouseId unconditionally,
      // which would have made ConfirmSalesOrderUseCase attempt an invalid
      // reservation for a product that doesn't track inventory at all.
      expect(convertedUntracked.warehouseId).toBeNull();
      expect(convertedUntracked.lineTotal).toBe(untrackedLine.lineTotal);

      const reloadedQuote = await ctx.listQuotes.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 10 } });
      expect(reloadedQuote.find((q) => q.id === quote.id)!.status).toBe("CONVERTED");
    });
  });
});
