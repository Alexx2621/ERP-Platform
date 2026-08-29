import { InMemoryAuditEntryRepository } from "../../test-support/in-memory-audit-entry.repository";
import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";
import { ListPlatformAuditEntriesUseCase } from "./list-platform-audit-entries.use-case";

describe("ListPlatformAuditEntriesUseCase", () => {
  it("only returns entries recorded with a null tenantId", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const record = new RecordAuditEntryUseCase(entries);
    const list = new ListPlatformAuditEntriesUseCase(entries);

    await record.execute({
      userId: "user-1",
      tenantId: null,
      action: "auth.login.succeeded",
      resource: "Session",
      correlationId: "c1",
    });
    await record.execute({
      userId: "user-2",
      tenantId: "tenant-a",
      action: "tenant.provisioned",
      resource: "Tenant",
      correlationId: "c2",
    });

    const result = await list.execute();
    expect(result).toHaveLength(1);
    expect(result[0].tenantId).toBeNull();
    expect(result[0].action).toBe("auth.login.succeeded");
  });

  it("caps the limit at 200 even if a larger value is requested", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const record = new RecordAuditEntryUseCase(entries);
    const list = new ListPlatformAuditEntriesUseCase(entries);
    const findSpy = jest.spyOn(entries, "findPlatformScoped");

    await record.execute({
      userId: "user-1",
      tenantId: null,
      action: "auth.login.succeeded",
      resource: "Session",
      correlationId: "c1",
    });

    await list.execute(500);
    expect(findSpy).toHaveBeenCalledWith(200);
  });

  it("defaults to a limit of 50 when none is given", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const list = new ListPlatformAuditEntriesUseCase(entries);
    const findSpy = jest.spyOn(entries, "findPlatformScoped");

    await list.execute();
    expect(findSpy).toHaveBeenCalledWith(50);
  });
});
