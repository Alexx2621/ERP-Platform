import { ListFilesUseCase } from "./list-files.use-case";
import { InMemoryFileObjectRepository } from "../../test-support/in-memory-file-object.repository";
import { FileObject } from "../../domain/file-object.entity";

function makeFile(id: string, overrides: Partial<Parameters<typeof FileObject.create>[0]> = {}) {
  return FileObject.create({
    id,
    tenantId: "tenant-1",
    companyId: null,
    ownerUserId: "user-1",
    storageKey: `tenants/tenant-1/files/${id}`,
    originalFilename: `${id}.txt`,
    contentType: "text/plain",
    sizeBytes: 10n,
    status: "ACTIVE",
    createdAt: new Date("2026-08-27T00:00:00.000Z"),
    deletedAt: null,
    purgedAt: null,
    ...overrides,
  });
}

describe("ListFilesUseCase", () => {
  it("only returns files belonging to the requested tenant", async () => {
    const files = new InMemoryFileObjectRepository();
    files.seed(makeFile("file-1"));
    files.seed(makeFile("file-2", { tenantId: "tenant-2" }));
    const useCase = new ListFilesUseCase(files);

    const result = await useCase.execute({ tenantId: "tenant-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("file-1");
  });

  it("filters by companyId when provided", async () => {
    const files = new InMemoryFileObjectRepository();
    files.seed(makeFile("file-1", { companyId: "company-1" }));
    files.seed(makeFile("file-2", { companyId: "company-2" }));
    const useCase = new ListFilesUseCase(files);

    const result = await useCase.execute({ tenantId: "tenant-1", companyId: "company-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("file-1");
  });

  it("caps the limit at 200", async () => {
    const files = new InMemoryFileObjectRepository();
    const useCase = new ListFilesUseCase(files);
    const spy = jest.spyOn(files, "findByTenant");

    await useCase.execute({ tenantId: "tenant-1", limit: 5000 });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }));
  });
});
