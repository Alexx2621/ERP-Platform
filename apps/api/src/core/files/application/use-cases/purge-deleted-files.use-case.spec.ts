import { FileObject } from "../../domain/file-object.entity";
import { InMemoryFileObjectRepository } from "../../test-support/in-memory-file-object.repository";
import { FakeFileStorageAdapter } from "../../test-support/fake-file-storage.adapter";
import { PurgeDeletedFilesUseCase } from "./purge-deleted-files.use-case";

function fileAt(overrides: Partial<Parameters<typeof FileObject.create>[0]> = {}): FileObject {
  return FileObject.create({
    id: overrides.id ?? "file-1",
    tenantId: "tenant-1",
    companyId: null,
    ownerUserId: "user-1",
    storageKey: overrides.storageKey ?? `tenants/tenant-1/files/${overrides.id ?? "file-1"}`,
    originalFilename: "invoice.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024n,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    purgedAt: null,
    ...overrides,
  });
}

describe("PurgeDeletedFilesUseCase", () => {
  function setup() {
    const files = new InMemoryFileObjectRepository();
    const storage = new FakeFileStorageAdapter();
    const useCase = new PurgeDeletedFilesUseCase(files, storage);
    return { files, storage, useCase };
  }

  const now = new Date("2026-09-01T00:00:00.000Z");

  it("purges a file deleted well past the retention window", async () => {
    const { files, storage, useCase } = setup();
    const file = fileAt({ status: "DELETED", deletedAt: new Date("2026-07-01T00:00:00.000Z") });
    await storage.putObject({ key: file.storageKey, body: Buffer.from("x"), contentType: "application/pdf" });
    files.seed(file);

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 1, failed: 0 });
    expect(storage.has(file.storageKey)).toBe(false);
    expect((await files.findById(file.id))?.status).toBe("PURGED");
  });

  it("leaves a file deleted within the retention window untouched", async () => {
    const { files, storage, useCase } = setup();
    const file = fileAt({ status: "DELETED", deletedAt: new Date("2026-08-25T00:00:00.000Z") });
    await storage.putObject({ key: file.storageKey, body: Buffer.from("x"), contentType: "application/pdf" });
    files.seed(file);

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 0, failed: 0 });
    expect(storage.has(file.storageKey)).toBe(true);
    expect((await files.findById(file.id))?.status).toBe("DELETED");
  });

  it("never touches an ACTIVE file", async () => {
    const { files, useCase } = setup();
    files.seed(fileAt({ status: "ACTIVE" }));

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 0, failed: 0 });
  });

  it("continues purging the rest of the batch when one file's storage delete fails", async () => {
    const { files, storage, useCase } = setup();
    const failing = fileAt({ id: "file-fail", deletedAt: new Date("2026-07-01T00:00:00.000Z"), status: "DELETED" });
    const ok = fileAt({ id: "file-ok", deletedAt: new Date("2026-07-01T00:00:00.000Z"), status: "DELETED" });
    files.seed(failing);
    files.seed(ok);
    jest
      .spyOn(storage, "deleteObject")
      .mockImplementationOnce(() => Promise.reject(new Error("network error")))
      .mockImplementationOnce(() => Promise.resolve());

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 1, failed: 1 });
    expect((await files.findById(failing.id))?.status).toBe("DELETED");
    expect((await files.findById(ok.id))?.status).toBe("PURGED");
  });

  it("respects the batch size limit", async () => {
    const { files, useCase } = setup();
    for (let i = 0; i < 5; i += 1) {
      files.seed(fileAt({ id: `file-${i}`, status: "DELETED", deletedAt: new Date("2026-07-01T00:00:00.000Z") }));
    }

    const result = await useCase.execute({ retentionDays: 30, batchSize: 2, now });

    expect(result).toEqual({ purged: 2, failed: 0 });
  });
});
