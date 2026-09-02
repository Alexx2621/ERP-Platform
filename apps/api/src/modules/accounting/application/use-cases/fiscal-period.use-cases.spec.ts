import { buildAccountingTestContext } from "../../test-support/build-accounting-test-context";
import { FiscalPeriodCodeAlreadyInUseError, FiscalPeriodOverlapsExistingError, NoOpenFiscalPeriodForDateError } from "../errors";

describe("FiscalPeriod use cases", () => {
  it("CreateFiscalPeriodUseCase rejects a duplicate code", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createFiscalPeriod.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        code: ctx.openPeriod.code,
        name: "Duplicate",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      }),
    ).rejects.toThrow(FiscalPeriodCodeAlreadyInUseError);
  });

  it("CreateFiscalPeriodUseCase rejects any date range overlapping an existing period", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createFiscalPeriod.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        code: "2026-01B",
        name: "Overlaps mid-January",
        startDate: "2026-01-15",
        endDate: "2026-02-15",
      }),
    ).rejects.toThrow(FiscalPeriodOverlapsExistingError);
  });

  it("CreateFiscalPeriodUseCase accepts a genuinely adjacent, non-overlapping period", async () => {
    const ctx = await buildAccountingTestContext();
    const feb = await ctx.createFiscalPeriod.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      code: "2026-02",
      name: "February 2026",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    expect(feb.status).toBe("OPEN");
  });

  it("CloseFiscalPeriodUseCase closes an OPEN period", async () => {
    const ctx = await buildAccountingTestContext();
    const closed = await ctx.closeFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.openPeriod.id });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedAt).not.toBeNull();
  });

  it("GetOpenFiscalPeriodForDateUseCase resolves the covering OPEN period", async () => {
    const ctx = await buildAccountingTestContext();
    const period = await ctx.getOpenFiscalPeriodForDate.execute(ctx.tenantId, ctx.companyId, new Date("2026-01-15"));
    expect(period.id).toBe(ctx.openPeriod.id);
  });

  it("GetOpenFiscalPeriodForDateUseCase rejects a date with no covering OPEN period", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(ctx.getOpenFiscalPeriodForDate.execute(ctx.tenantId, ctx.companyId, new Date("2026-06-01"))).rejects.toThrow(
      NoOpenFiscalPeriodForDateError,
    );
  });

  it("GetOpenFiscalPeriodForDateUseCase never resolves to a CLOSED period", async () => {
    const ctx = await buildAccountingTestContext();
    await ctx.closeFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.openPeriod.id });
    await expect(ctx.getOpenFiscalPeriodForDate.execute(ctx.tenantId, ctx.companyId, new Date("2026-01-15"))).rejects.toThrow(
      NoOpenFiscalPeriodForDateError,
    );
  });
});
