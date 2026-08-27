import { AuditEntry } from "./audit-entry.entity";

const base = {
  id: "a1",
  userId: "user-1",
  tenantId: "tenant-1",
  companyId: null,
  resourceId: null,
  previousValues: null,
  newValues: null,
  ipAddress: null,
  userAgent: null,
  correlationId: "correlation-1",
  createdAt: new Date(),
};

describe("AuditEntry", () => {
  it("creates a valid entry", () => {
    const entry = AuditEntry.create({ ...base, action: "auth.login.succeeded", resource: "Session" });
    expect(entry.action).toBe("auth.login.succeeded");
    expect(entry.resource).toBe("Session");
    expect(entry.userId).toBe("user-1");
  });

  it("rejects an empty action", () => {
    expect(() => AuditEntry.create({ ...base, action: "  ", resource: "Session" })).toThrow();
  });

  it("rejects an empty resource", () => {
    expect(() => AuditEntry.create({ ...base, action: "auth.login.succeeded", resource: " " })).toThrow();
  });

  it("allows a null actor for unauthenticated events", () => {
    const entry = AuditEntry.create({
      ...base,
      userId: null,
      tenantId: null,
      action: "auth.login.failed",
      resource: "Session",
    });
    expect(entry.userId).toBeNull();
    expect(entry.tenantId).toBeNull();
  });
});
