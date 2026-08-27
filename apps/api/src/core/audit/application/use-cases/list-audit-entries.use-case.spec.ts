import { InMemoryAuditEntryRepository } from "../../test-support/in-memory-audit-entry.repository";
import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";
import { ListAuditEntriesUseCase } from "./list-audit-entries.use-case";

describe("ListAuditEntriesUseCase", () => {
  it("only returns entries for the requested tenant", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const record = new RecordAuditEntryUseCase(entries);
    const list = new ListAuditEntriesUseCase(entries);

    await record.execute({
      userId: "user-1",
      tenantId: "tenant-a",
      action: "tenant.provisioned",
      resource: "Tenant",
      correlationId: "c1",
    });
    await record.execute({
      userId: "user-2",
      tenantId: "tenant-b",
      action: "tenant.provisioned",
      resource: "Tenant",
      correlationId: "c2",
    });

    const resultA = await list.execute({ tenantId: "tenant-a" });
    expect(resultA).toHaveLength(1);
    expect(resultA[0].tenantId).toBe("tenant-a");
  });

  it("excludes entries recorded with a null tenantId (Authentication/User events)", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const record = new RecordAuditEntryUseCase(entries);
    const list = new ListAuditEntriesUseCase(entries);

    await record.execute({
      userId: "user-1",
      tenantId: null,
      action: "auth.login.succeeded",
      resource: "Session",
      correlationId: "c1",
    });

    const result = await list.execute({ tenantId: "tenant-a" });
    expect(result).toHaveLength(0);
  });

  it("caps the limit at 200 even if a larger value is requested", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const record = new RecordAuditEntryUseCase(entries);
    const list = new ListAuditEntriesUseCase(entries);
    const findSpy = jest.spyOn(entries, "findByTenant");

    for (let i = 0; i < 3; i++) {
      await record.execute({
        userId: "user-1",
        tenantId: "tenant-a",
        action: "tenant.provisioned",
        resource: "Tenant",
        correlationId: `c${i}`,
      });
    }

    await list.execute({ tenantId: "tenant-a", limit: 500 });
    expect(findSpy).toHaveBeenCalledWith({ tenantId: "tenant-a", limit: 200 });
  });
});
