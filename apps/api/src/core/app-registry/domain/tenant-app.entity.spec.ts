import { TenantApp } from "./tenant-app.entity";

const base = {
  id: "ta1",
  tenantId: "t1",
  appDefinitionId: "ad1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("TenantApp", () => {
  it("rejects an ENABLED row carrying a disabledAt", () => {
    expect(() =>
      TenantApp.create({
        ...base,
        status: "ENABLED",
        enabledAt: new Date(),
        disabledAt: new Date(),
      }),
    ).toThrow();
  });

  it("enable() clears disabledAt and sets status/enabledAt", () => {
    const tenantApp = TenantApp.create({
      ...base,
      status: "DISABLED",
      enabledAt: new Date("2026-01-01T00:00:00Z"),
      disabledAt: new Date("2026-01-02T00:00:00Z"),
    });
    const now = new Date("2026-01-03T00:00:00Z");
    tenantApp.enable(now);
    expect(tenantApp.status).toBe("ENABLED");
    expect(tenantApp.enabledAt).toBe(now);
    expect(tenantApp.disabledAt).toBeNull();
    expect(tenantApp.updatedAt).toBe(now);
  });

  it("disable() sets status/disabledAt", () => {
    const tenantApp = TenantApp.create({
      ...base,
      status: "ENABLED",
      enabledAt: new Date("2026-01-01T00:00:00Z"),
      disabledAt: null,
    });
    const now = new Date("2026-01-03T00:00:00Z");
    tenantApp.disable(now);
    expect(tenantApp.status).toBe("DISABLED");
    expect(tenantApp.disabledAt).toBe(now);
    expect(tenantApp.updatedAt).toBe(now);
  });
});
