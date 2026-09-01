import { buildPosTestContext } from "../../test-support/build-pos-test-context";
import { PosSaleIdempotencyConflictError } from "../errors";
import { RingUpSaleUseCase } from "./ring-up-sale.use-case";
import { GetPosSaleUseCase } from "./get-pos-sale.use-case";
import {
  PosPaymentFailedError,
  PosSaleAmountTenderedTooLowError,
  PosSaleHasNoLinesError,
  PosShiftNotFoundError,
  PosShiftNotOpenError,
} from "../errors";
import { InsufficientInventoryForOrderError } from "../../../sales";

describe("RingUpSaleUseCase", () => {
  it("rings up a CASH sale: creates, confirms, captures and fulfills a real SalesOrder", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });

    const { posSale, wasReplayed } = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      amountTendered: "50.0000",
      idempotencyKey: "ring-1",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "3" }],
    });

    expect(wasReplayed).toBe(false);
    expect(posSale.amount).toBe("30.0000");
    expect(posSale.paymentMethod).toBe("CASH");
    expect(posSale.amountTendered).toBe("50.0000");
    expect(posSale.changeDue).toBe("20.0000");

    const order = await ctx.getSalesOrder.execute(ctx.tenantId, posSale.salesOrderId);
    expect(order!.status).toBe("FULFILLED");

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.onHandQuantity).toBe("7.0000");
    expect(balance.availableQuantity).toBe("7.0000");
  });

  it("auto-resolves the unit price from the product's basePrice when omitted", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    const { posSale } = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "ring-price",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
    });
    // trackedProduct.basePrice is "10.0000" — see build-sales-test-context.ts
    expect(posSale.amount).toBe("10.0000");
  });

  it("is idempotent: a retried request with the same idempotencyKey returns the original sale without ringing up a second one", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    const input = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH" as const,
      idempotencyKey: "retry-ring",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "2" }],
    };

    const first = await ctx.ringUpSale.execute(input);
    const second = await ctx.ringUpSale.execute(input);

    expect(first.wasReplayed).toBe(false);
    expect(second.wasReplayed).toBe(true);
    expect(second.posSale.id).toBe(first.posSale.id);

    const all = await ctx.listPosSales.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(all).toHaveLength(1);
  });

  it("rejects a sale with no lines", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });
    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "CASH",
        idempotencyKey: "no-lines",
        lines: [],
      }),
    ).rejects.toThrow(PosSaleHasNoLinesError);
  });

  it("rejects a shift that does not exist", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: "missing",
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "CASH",
        idempotencyKey: "missing-shift",
        lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PosShiftNotFoundError);
  });

  it("rejects ringing up a sale against a CLOSED shift", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });
    await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "0" });
    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "CASH",
        idempotencyKey: "closed-shift",
        lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PosShiftNotOpenError);
  });

  it("compensates: insufficient inventory cancels the order, releases nothing to reserve, and leaves stock untouched", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("2");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "CASH",
        idempotencyKey: "insufficient",
        lines: [{ productId: ctx.trackedProduct.id, quantity: "5" }],
      }),
    ).rejects.toThrow(InsufficientInventoryForOrderError);

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.onHandQuantity).toBe("2.0000");
    expect(balance.reservedQuantity).toBe("0.0000");

    const sales = await ctx.listPosSales.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(sales).toHaveLength(0);

    const orders = await ctx.listSalesOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(orders.every((o) => o.status === "CANCELLED")).toBe(true);
  });

  it("compensates: a declined BANK_TRANSFER (missing reference) cancels the order and throws PosPaymentFailedError", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "BANK_TRANSFER",
        idempotencyKey: "declined",
        lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
      }),
    ).rejects.toThrow(PosPaymentFailedError);

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.reservedQuantity).toBe("0.0000");

    const orders = await ctx.listSalesOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(orders.every((o) => o.status === "CANCELLED")).toBe(true);
  });

  it("captures a BANK_TRANSFER sale when a reference is provided", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    const { posSale } = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "TRX-1",
      idempotencyKey: "bank-ok",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
    });
    expect(posSale.paymentMethod).toBe("BANK_TRANSFER");
    expect(posSale.amountTendered).toBeNull();
    expect(posSale.changeDue).toBeNull();
  });

  it("compensates: amountTendered below the total rejects with PosSaleAmountTenderedTooLowError, cancelling the order", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    await expect(
      ctx.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        customerId: ctx.customer.id,
        currency: "USD",
        paymentMethod: "CASH",
        amountTendered: "5",
        idempotencyKey: "low-tender",
        lines: [{ productId: ctx.trackedProduct.id, quantity: "3" }], // total 30.0000
      }),
    ).rejects.toThrow(PosSaleAmountTenderedTooLowError);

    const orders = await ctx.listSalesOrders.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(orders.every((o) => o.status === "CANCELLED")).toBe(true);
  });

  it("reacts to a PosSaleIdempotencyConflictError raised by the repository's save() by re-fetching and returning the winner", async () => {
    // A real concurrent race cannot be reliably reproduced against the
    // in-memory repository — same reasoning already documented on
    // Payments' own equivalent test ("real concurrency is verified against
    // actual Postgres in the integration suite, not here"). This verifies
    // RingUpSaleUseCase's own reaction contract directly.
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });

    const { posSale: winner } = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "race-key",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
    });

    let findByIdempotencyKeyCalls = 0;
    const raceSimulatingRepository = {
      findById: async () => null,
      findByIdempotencyKey: async () => {
        findByIdempotencyKeyCalls += 1;
        return findByIdempotencyKeyCalls === 1 ? null : winner;
      },
      listByShift: async () => [],
      listByCompany: async () => [],
      save: async () => {
        throw new PosSaleIdempotencyConflictError();
      },
    };

    const ringUpUnderRace = new RingUpSaleUseCase(
      raceSimulatingRepository as never,
      ctx.shifts,
      ctx.registers,
      ctx.createSalesOrder,
      ctx.addSalesOrderLine,
      ctx.confirmSalesOrder,
      ctx.cancelSalesOrder,
      ctx.fulfillSalesOrder,
      ctx.listSalesOrderLines,
      ctx.capturePayment,
    );

    const loserResult = await ringUpUnderRace.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "race-key",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
    });
    expect(loserResult.posSale.id).toBe(winner.id);
    expect(loserResult.wasReplayed).toBe(true);
    expect(findByIdempotencyKeyCalls).toBe(2);
  });
});

describe("GetPosSaleUseCase", () => {
  it("rejects a sale from a different company", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" });
    const { posSale } = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "get-sale",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "1" }],
    });
    const getPosSale = ctx.getPosSale;
    expect(getPosSale).toBeInstanceOf(GetPosSaleUseCase);
    await expect(getPosSale.execute(ctx.tenantId, ctx.otherCompanyId, posSale.id)).rejects.toThrow();
  });
});
