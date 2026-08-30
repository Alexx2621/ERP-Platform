import { GetFileDownloadUrlUseCase } from "./get-file-download-url.use-case";
import { InMemoryFileObjectRepository } from "../../test-support/in-memory-file-object.repository";
import { FakeFileStorageAdapter } from "../../test-support/fake-file-storage.adapter";
import { FileObject } from "../../domain/file-object.entity";
import { FileNotFoundError } from "../errors";

function makeFile(overrides: Partial<Parameters<typeof FileObject.create>[0]> = {}) {
  return FileObject.create({
    id: "file-1",
    tenantId: "tenant-1",
    companyId: null,
    ownerUserId: "user-1",
    storageKey: "tenants/tenant-1/files/file-1",
    originalFilename: "invoice.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024n,
    status: "ACTIVE",
    createdAt: new Date("2026-08-27T00:00:00.000Z"),
    deletedAt: null,
    purgedAt: null,
    ...overrides,
  });
}

describe("GetFileDownloadUrlUseCase", () => {
  function setup() {
    const files = new InMemoryFileObjectRepository();
    const storage = new FakeFileStorageAdapter();
    const useCase = new GetFileDownloadUrlUseCase(files, storage);
    return { files, storage, useCase };
  }

  it("issues a signed URL for a file belonging to the caller's tenant", async () => {
    const { files, useCase } = setup();
    files.seed(makeFile());

    const result = await useCase.execute({ fileId: "file-1", tenantId: "tenant-1", ttlSeconds: 300 });

    expect(result.url).toContain("tenants/tenant-1/files/file-1");
    expect(result.expiresInSeconds).toBe(300);
  });

  it("throws FileNotFoundError for a file that does not exist", async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute({ fileId: "missing", tenantId: "tenant-1", ttlSeconds: 300 }),
    ).rejects.toThrow(FileNotFoundError);
  });

  it("throws FileNotFoundError for a file belonging to a different tenant", async () => {
    const { files, useCase } = setup();
    files.seed(makeFile({ tenantId: "tenant-2" }));
    await expect(
      useCase.execute({ fileId: "file-1", tenantId: "tenant-1", ttlSeconds: 300 }),
    ).rejects.toThrow(FileNotFoundError);
  });

  it("throws FileNotFoundError for a soft-deleted file", async () => {
    const { files, useCase } = setup();
    files.seed(makeFile({ status: "DELETED", deletedAt: new Date() }));
    await expect(
      useCase.execute({ fileId: "file-1", tenantId: "tenant-1", ttlSeconds: 300 }),
    ).rejects.toThrow(FileNotFoundError);
  });
});
