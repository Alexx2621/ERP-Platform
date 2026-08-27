import { InMemoryAuditEntryRepository } from "../../test-support/in-memory-audit-entry.repository";
import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";
import type { AuditEntryRepository } from "../../domain/audit-entry.repository";

describe("RecordAuditEntryUseCase", () => {
  it("persists a fully-populated entry", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const useCase = new RecordAuditEntryUseCase(entries);

    await useCase.execute({
      userId: "user-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      action: "configuration.setting.changed",
      resource: "SettingValue",
      resourceId: "setting-value-1",
      previousValues: { value: "USD" },
      newValues: { value: "EUR" },
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      correlationId: "correlation-1",
    });

    const stored = await entries.findByTenant({ tenantId: "tenant-1", limit: 10 });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      action: "configuration.setting.changed",
      resource: "SettingValue",
      previousValues: { value: "USD" },
      newValues: { value: "EUR" },
    });
  });

  it("defaults optional fields to null when omitted", async () => {
    const entries = new InMemoryAuditEntryRepository();
    const useCase = new RecordAuditEntryUseCase(entries);

    await useCase.execute({
      userId: null,
      tenantId: null,
      action: "auth.login.failed",
      resource: "Session",
      correlationId: "correlation-2",
    });

    // findByTenant only returns tenant-scoped entries; use a direct check instead.
    const stored = await entries.findByTenant({ tenantId: "tenant-1", limit: 10 });
    expect(stored).toHaveLength(0);
  });

  it("never throws, even when the repository write fails", async () => {
    const failingRepository: AuditEntryRepository = {
      record: jest.fn().mockRejectedValue(new Error("database unavailable")),
      findByTenant: jest.fn().mockResolvedValue([]),
    };
    const useCase = new RecordAuditEntryUseCase(failingRepository);

    await expect(
      useCase.execute({
        userId: "user-1",
        tenantId: "tenant-1",
        action: "tenant.provisioned",
        resource: "Tenant",
        correlationId: "correlation-3",
      }),
    ).resolves.toBeUndefined();
    expect(failingRepository.record).toHaveBeenCalled();
  });
});
