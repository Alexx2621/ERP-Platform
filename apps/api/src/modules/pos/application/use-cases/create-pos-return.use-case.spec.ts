import { buildPosTestContext } from "../../test-support/build-pos-test-context";
import { PosReturnHasNoLinesError, PosSaleNotFoundError, PosShiftNotOpenError } from "../errors";
import { SalesReturnExceedsFulfilledQuantityError } from "../../../sales";

async function ringUpAndOpen(ctx: Awaited<ReturnType<typeof buildPosTestContext>>) {
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
    idempotencyKey: "base-sale",
    lines: [{ productId: ctx.trackedProduct.id, quantity: "5" }],
  });
  const orderLines = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: posSale.salesOrderId });
  return { shift, posSale, orderLine: orderLines[0] };
}

describe("CreatePosReturnUseCase", () => {
  it("records a return with a full refund of the original payment", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);

    const { posReturn, wasReplayed } = await ctx.createPosReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "5" }],
      issueRefund: true,
      idempotencyKey: "return-1",
    });

    expect(wasReplayed).toBe(false);
    expect(posReturn.refunded).toBe(true);
    expect(posReturn.refundAmount).toBe(posSale.amount);
    expect(posReturn.refundMethod).toBe("CASH");

    const balance = ctx.balances.items.find((b) => b.productId === ctx.trackedProduct.id)!;
    expect(balance.onHandQuantity).toBe("10.0000"); // 10 - 5 (sale) + 5 (return) = 10
  });

  it("records a goods-only return without a refund", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);

    const { posReturn } = await ctx.createPosReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "2" }],
      issueRefund: false,
      idempotencyKey: "return-goods-only",
    });

    expect(posReturn.refunded).toBe(false);
    expect(posReturn.refundAmount).toBeNull();
    expect(posReturn.refundMethod).toBeNull();
  });

  it("rejects a return with no lines", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale } = await ringUpAndOpen(ctx);
    await expect(
      ctx.createPosReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        posSaleId: posSale.id,
        lines: [],
        issueRefund: false,
        idempotencyKey: "no-lines",
      }),
    ).rejects.toThrow(PosReturnHasNoLinesError);
  });

  it("rejects a return against a CLOSED shift", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);
    await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "0" });
    await expect(
      ctx.createPosReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        posSaleId: posSale.id,
        lines: [{ salesOrderLineId: orderLine.id, quantity: "1" }],
        issueRefund: false,
        idempotencyKey: "closed-shift-return",
      }),
    ).rejects.toThrow(PosShiftNotOpenError);
  });

  it("rejects a sale that does not exist in this company", async () => {
    const ctx = await buildPosTestContext();
    const { shift, orderLine } = await ringUpAndOpen(ctx);
    await expect(
      ctx.createPosReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        posSaleId: "missing",
        lines: [{ salesOrderLineId: orderLine.id, quantity: "1" }],
        issueRefund: false,
        idempotencyKey: "missing-sale",
      }),
    ).rejects.toThrow(PosSaleNotFoundError);
  });

  it("rejects returning more than was ever fulfilled for a line", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);
    await expect(
      ctx.createPosReturn.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        correlationId: ctx.correlationId,
        shiftId: shift.id,
        posSaleId: posSale.id,
        lines: [{ salesOrderLineId: orderLine.id, quantity: "6" }], // only 5 were sold
        issueRefund: false,
        idempotencyKey: "too-much",
      }),
    ).rejects.toThrow(SalesReturnExceedsFulfilledQuantityError);
  });

  it("is idempotent: a retried request with the same idempotencyKey returns the original return without refunding twice", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);

    const input = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "5" }],
      issueRefund: true,
      idempotencyKey: "retry-return",
    };
    const first = await ctx.createPosReturn.execute(input);
    const second = await ctx.createPosReturn.execute(input);

    expect(first.wasReplayed).toBe(false);
    expect(second.wasReplayed).toBe(true);
    expect(second.posReturn.id).toBe(first.posReturn.id);

    const all = await ctx.listPosReturns.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(all).toHaveLength(1);
  });

  it("allows a second, goods-only return after a first refunded return, without attempting to refund again", async () => {
    const ctx = await buildPosTestContext();
    const { shift, posSale, orderLine } = await ringUpAndOpen(ctx);

    await ctx.createPosReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "3" }],
      issueRefund: true,
      idempotencyKey: "return-a",
    });

    const second = await ctx.createPosReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      lines: [{ salesOrderLineId: orderLine.id, quantity: "2" }],
      issueRefund: false,
      idempotencyKey: "return-b",
    });
    expect(second.posReturn.refunded).toBe(false);
  });
});
