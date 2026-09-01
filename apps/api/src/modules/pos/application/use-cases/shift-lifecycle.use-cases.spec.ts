import { buildPosTestContext } from "../../test-support/build-pos-test-context";
import { PosRegisterHasOpenShiftError, PosRegisterNotActiveError, PosRegisterNotFoundError, PosShiftNotFoundError, PosShiftNotOpenError } from "../errors";

describe("PosShift lifecycle use cases", () => {
  it("opens a shift on an ACTIVE register", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    expect(shift.status).toBe("OPEN");
    expect(shift.openingCash).toBe("50");
    expect(shift.openedByUserId).toBe(ctx.actorUserId);
  });

  it("rejects opening a shift on an INACTIVE register", async () => {
    const ctx = await buildPosTestContext();
    await ctx.setRegisterStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.register.id, status: "INACTIVE" });
    await expect(
      ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" }),
    ).rejects.toThrow(PosRegisterNotActiveError);
  });

  it("rejects opening a second OPEN shift on the same register", async () => {
    const ctx = await buildPosTestContext();
    await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    await expect(
      ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "0" }),
    ).rejects.toThrow(PosRegisterHasOpenShiftError);
  });

  it("allows opening a new shift once the previous one is closed", async () => {
    const ctx = await buildPosTestContext();
    const first = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: first.id, closingCashCounted: "50" });
    const second = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    expect(second.status).toBe("OPEN");
  });

  it("rejects opening a shift on a register from a different company", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" }),
    ).rejects.toThrow(PosRegisterNotFoundError);
  });

  it("closes a shift with zero variance when no cash moved", async () => {
    const ctx = await buildPosTestContext();
    // openingCash is a raw pass-through value (never routed through
    // addDecimal/subtractDecimal when nothing moves during the shift), so
    // this input is supplied already 4-decimal-padded, matching how
    // Payments' own equivalent tests always supply pre-padded amounts.
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50.0000" });
    const closed = await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "50" });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closingCashExpected).toBe("50.0000");
    expect(closed.cashVariance).toBe("0.0000");
  });

  it("computes a shortfall as a negative variance", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    const closed = await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "45" });
    expect(closed.cashVariance).toBe("-5.0000");
  });

  it("rejects closing an already-CLOSED shift", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "50" });
    await expect(
      ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "50" }),
    ).rejects.toThrow(PosShiftNotOpenError);
  });

  it("computes expected cash from opening cash, cash movements, CASH sales and CASH refunds — all Decimal-safe", async () => {
    const ctx = await buildPosTestContext();
    await ctx.receiveStock("10");
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });

    await ctx.recordCashMovement.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, type: "CASH_IN", amount: "20", reason: "Fondo adicional" });
    await ctx.recordCashMovement.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, type: "CASH_OUT", amount: "5", reason: "Depósito a bóveda" });

    const saleA = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "sale-a",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "3" }],
    });
    expect(saleA.posSale.amount).toBe("30.0000");

    const saleB = await ctx.ringUpSale.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      customerId: ctx.customer.id,
      currency: "USD",
      paymentMethod: "CASH",
      idempotencyKey: "sale-b",
      lines: [{ productId: ctx.trackedProduct.id, quantity: "2" }],
    });
    expect(saleB.posSale.amount).toBe("20.0000");

    const orderALines = await ctx.listSalesOrderLines.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, salesOrderId: saleA.posSale.salesOrderId });
    await ctx.createPosReturn.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      correlationId: ctx.correlationId,
      shiftId: shift.id,
      posSaleId: saleA.posSale.id,
      lines: [{ salesOrderLineId: orderALines[0].id, quantity: "3" }],
      issueRefund: true,
      idempotencyKey: "return-a",
    });

    // 50 (opening) + 20 (cash-in) - 5 (cash-out) + 30 (sale A) + 20 (sale B) - 30 (refund of sale A) = 85
    const closed = await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "85" });
    expect(closed.closingCashExpected).toBe("85.0000");
    expect(closed.cashVariance).toBe("0.0000");
  });

  it("lists and gets shifts scoped to a company", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    const list = await ctx.listShifts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(list).toHaveLength(1);
    const found = await ctx.getShift.execute(ctx.tenantId, ctx.companyId, shift.id);
    expect(found.id).toBe(shift.id);
    await expect(ctx.getShift.execute(ctx.tenantId, ctx.otherCompanyId, shift.id)).rejects.toThrow(PosShiftNotFoundError);
  });
});

describe("RecordCashMovementUseCase", () => {
  it("rejects a movement against a shift that is not OPEN", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    await ctx.closeShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, closingCashCounted: "50" });
    await expect(
      ctx.recordCashMovement.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, type: "CASH_IN", amount: "10", reason: "Fondo" }),
    ).rejects.toThrow(PosShiftNotOpenError);
  });

  it("lists a shift's movements in order", async () => {
    const ctx = await buildPosTestContext();
    const shift = await ctx.openShift.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, registerId: ctx.register.id, openingCash: "50" });
    await ctx.recordCashMovement.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, type: "CASH_IN", amount: "10", reason: "Fondo" });
    await ctx.recordCashMovement.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, shiftId: shift.id, type: "CASH_OUT", amount: "3", reason: "Retiro" });
    const movements = await ctx.listCashMovements.execute(ctx.tenantId, ctx.companyId, shift.id);
    expect(movements).toHaveLength(2);
    expect(movements[0].type).toBe("CASH_IN");
    expect(movements[1].type).toBe("CASH_OUT");
  });
});
