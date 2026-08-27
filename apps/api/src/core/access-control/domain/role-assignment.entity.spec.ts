import { RoleAssignment } from "./role-assignment.entity";

const base = { id: "a1", tenantId: "t1", membershipId: "m1", roleId: "r1", createdAt: new Date() };

describe("RoleAssignment", () => {
  it("rejects a TENANT-scoped assignment carrying a scopeId", () => {
    expect(() => RoleAssignment.create({ ...base, scopeType: "TENANT", scopeId: "c1" })).toThrow();
  });

  it("rejects a COMPANY-scoped assignment without a scopeId", () => {
    expect(() => RoleAssignment.create({ ...base, scopeType: "COMPANY", scopeId: null })).toThrow();
  });

  it("a TENANT-scoped assignment covers any company context", () => {
    const assignment = RoleAssignment.create({ ...base, scopeType: "TENANT", scopeId: null });
    expect(assignment.covers({})).toBe(true);
    expect(assignment.covers({ companyId: "c1" })).toBe(true);
  });

  it("a COMPANY-scoped assignment covers only the matching company", () => {
    const assignment = RoleAssignment.create({ ...base, scopeType: "COMPANY", scopeId: "c1" });
    expect(assignment.covers({ companyId: "c1" })).toBe(true);
    expect(assignment.covers({ companyId: "c2" })).toBe(false);
    expect(assignment.covers({})).toBe(false);
  });
});
