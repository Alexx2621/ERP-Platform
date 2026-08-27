import { SettingValue } from "./setting-value.entity";

const base = { id: "v1", definitionId: "d1", value: "USD", createdAt: new Date(), updatedAt: new Date() };

describe("SettingValue", () => {
  it("rejects a PLATFORM-scoped value carrying a tenantId or companyId", () => {
    expect(() =>
      SettingValue.create({ ...base, scopeType: "PLATFORM", tenantId: "t1", companyId: null }),
    ).toThrow();
    expect(() =>
      SettingValue.create({ ...base, scopeType: "PLATFORM", tenantId: null, companyId: "c1" }),
    ).toThrow();
  });

  it("rejects a TENANT-scoped value without a tenantId, or carrying a companyId", () => {
    expect(() =>
      SettingValue.create({ ...base, scopeType: "TENANT", tenantId: null, companyId: null }),
    ).toThrow();
    expect(() =>
      SettingValue.create({ ...base, scopeType: "TENANT", tenantId: "t1", companyId: "c1" }),
    ).toThrow();
  });

  it("rejects a COMPANY-scoped value missing either tenantId or companyId", () => {
    expect(() =>
      SettingValue.create({ ...base, scopeType: "COMPANY", tenantId: "t1", companyId: null }),
    ).toThrow();
    expect(() =>
      SettingValue.create({ ...base, scopeType: "COMPANY", tenantId: null, companyId: "c1" }),
    ).toThrow();
  });

  it("computes the expected scopeKey per scope type", () => {
    const platform = SettingValue.create({ ...base, scopeType: "PLATFORM", tenantId: null, companyId: null });
    expect(platform.scopeKey).toBe("platform");

    const tenant = SettingValue.create({ ...base, scopeType: "TENANT", tenantId: "t1", companyId: null });
    expect(tenant.scopeKey).toBe("t1");

    const company = SettingValue.create({ ...base, scopeType: "COMPANY", tenantId: "t1", companyId: "c1" });
    expect(company.scopeKey).toBe("t1:c1");
  });
});
