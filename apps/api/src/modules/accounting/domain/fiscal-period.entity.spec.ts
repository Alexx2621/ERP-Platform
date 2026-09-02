import { FiscalPeriod, FiscalPeriodProps } from "./fiscal-period.entity";

function props(overrides: Partial<FiscalPeriodProps> = {}): FiscalPeriodProps {
  const now = new Date();
  return {
    id: "period-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "2026-01",
    name: "January 2026",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-31"),
    status: "OPEN",
    closedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("FiscalPeriod", () => {
  it("rejects startDate after endDate", () => {
    expect(() => FiscalPeriod.create(props({ startDate: new Date("2026-02-01"), endDate: new Date("2026-01-01") }))).toThrow();
  });

  it("rejects an empty code or name", () => {
    expect(() => FiscalPeriod.create(props({ code: " " }))).toThrow();
    expect(() => FiscalPeriod.create(props({ name: " " }))).toThrow();
  });

  it("covers() is inclusive of both endpoints", () => {
    const period = FiscalPeriod.create(props());
    expect(period.covers(new Date("2026-01-01"))).toBe(true);
    expect(period.covers(new Date("2026-01-31"))).toBe(true);
    expect(period.covers(new Date("2026-01-15"))).toBe(true);
    expect(period.covers(new Date("2025-12-31"))).toBe(false);
    expect(period.covers(new Date("2026-02-01"))).toBe(false);
  });

  it("close() transitions OPEN -> CLOSED and sets closedAt", () => {
    const period = FiscalPeriod.create(props());
    const now = new Date("2026-02-01T00:00:00Z");
    period.close(now);
    expect(period.status).toBe("CLOSED");
    expect(period.closedAt).toBe(now);
    expect(period.version).toBe(2);
  });

  it("close() is terminal — closing twice throws", () => {
    const period = FiscalPeriod.create(props());
    period.close(new Date());
    expect(() => period.close(new Date())).toThrow(/Cannot close/);
  });
});
