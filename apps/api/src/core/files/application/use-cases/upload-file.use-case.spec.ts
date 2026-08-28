import { UploadFileUseCase } from "./upload-file.use-case";
import { InMemoryFileObjectRepository } from "../../test-support/in-memory-file-object.repository";
import { FakeFileStorageAdapter } from "../../test-support/fake-file-storage.adapter";
import { EmptyFileError, FileTooLargeError } from "../errors";

describe("UploadFileUseCase", () => {
  function setup() {
    const files = new InMemoryFileObjectRepository();
    const storage = new FakeFileStorageAdapter();
    const useCase = new UploadFileUseCase(files, storage);
    return { files, storage, useCase };
  }

  it("uploads to storage before persisting metadata, and returns an ACTIVE file", async () => {
    const { files, storage, useCase } = setup();
    const buffer = Buffer.from("hello world");

    const file = await useCase.execute({
      tenantId: "tenant-1",
      companyId: null,
      ownerUserId: "user-1",
      originalFilename: "notes.txt",
      contentType: "text/plain",
      buffer,
      maxSizeBytes: 1024,
    });

    expect(file.status).toBe("ACTIVE");
    expect(file.sizeBytes).toBe(BigInt(buffer.byteLength));
    expect(file.storageKey).toBe(`tenants/tenant-1/files/${file.id}`);
    expect(storage.has(file.storageKey)).toBe(true);
    expect(storage.putObjectCalls).toHaveLength(1);
    expect(storage.putObjectCalls[0]).toMatchObject({
      key: file.storageKey,
      contentType: "text/plain",
    });
    expect(await files.findById(file.id)).not.toBeNull();
  });

  it("rejects an empty buffer without touching storage", async () => {
    const { storage, useCase } = setup();
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        companyId: null,
        ownerUserId: "user-1",
        originalFilename: "empty.txt",
        contentType: "text/plain",
        buffer: Buffer.alloc(0),
        maxSizeBytes: 1024,
      }),
    ).rejects.toThrow(EmptyFileError);
    expect(storage.putObjectCalls).toHaveLength(0);
  });

  it("rejects a buffer larger than maxSizeBytes without touching storage", async () => {
    const { storage, useCase } = setup();
    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        companyId: null,
        ownerUserId: "user-1",
        originalFilename: "big.bin",
        contentType: "application/octet-stream",
        buffer: Buffer.alloc(10),
        maxSizeBytes: 5,
      }),
    ).rejects.toThrow(FileTooLargeError);
    expect(storage.putObjectCalls).toHaveLength(0);
  });

  it("carries the company scope from the input into the stored file", async () => {
    const { useCase } = setup();
    const file = await useCase.execute({
      tenantId: "tenant-1",
      companyId: "company-1",
      ownerUserId: "user-1",
      originalFilename: "receipt.pdf",
      contentType: "application/pdf",
      buffer: Buffer.from("x"),
      maxSizeBytes: 1024,
    });
    expect(file.companyId).toBe("company-1");
  });
});
