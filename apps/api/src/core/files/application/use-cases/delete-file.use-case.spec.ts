import { DeleteFileUseCase } from "./delete-file.use-case";
import { InMemoryFileObjectRepository } from "../../test-support/in-memory-file-object.repository";
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

describe("DeleteFileUseCase", () => {
  it("soft-deletes a file belonging to the caller's tenant", async () => {
    const files = new InMemoryFileObjectRepository();
    files.seed(makeFile());
    const useCase = new DeleteFileUseCase(files);

    const deleted = await useCase.execute({ fileId: "file-1", tenantId: "tenant-1" });

    expect(deleted.status).toBe("DELETED");
    expect(deleted.deletedAt).not.toBeNull();
    expect((await files.findById("file-1"))?.status).toBe("DELETED");
  });

  it("throws FileNotFoundError for a file that does not exist", async () => {
    const files = new InMemoryFileObjectRepository();
    const useCase = new DeleteFileUseCase(files);
    await expect(useCase.execute({ fileId: "missing", tenantId: "tenant-1" })).rejects.toThrow(
      FileNotFoundError,
    );
  });

  it("throws FileNotFoundError for a file belonging to a different tenant", async () => {
    const files = new InMemoryFileObjectRepository();
    files.seed(makeFile({ tenantId: "tenant-2" }));
    const useCase = new DeleteFileUseCase(files);
    await expect(useCase.execute({ fileId: "file-1", tenantId: "tenant-1" })).rejects.toThrow(
      FileNotFoundError,
    );
  });
});
