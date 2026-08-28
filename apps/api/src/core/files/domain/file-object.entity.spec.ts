import { FileObject } from "./file-object.entity";

function baseProps() {
  return {
    id: "file-1",
    tenantId: "tenant-1",
    companyId: null,
    ownerUserId: "user-1",
    storageKey: "tenants/tenant-1/files/file-1",
    originalFilename: "invoice.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024n,
    status: "ACTIVE" as const,
    createdAt: new Date("2026-08-27T00:00:00.000Z"),
    deletedAt: null,
  };
}

describe("FileObject", () => {
  it("creates a valid file object", () => {
    const file = FileObject.create(baseProps());
    expect(file.id).toBe("file-1");
    expect(file.storageKey).toBe("tenants/tenant-1/files/file-1");
    expect(file.status).toBe("ACTIVE");
  });

  it("trims filename, content type and storage key", () => {
    const file = FileObject.create({
      ...baseProps(),
      originalFilename: "  invoice.pdf  ",
      contentType: " application/pdf ",
      storageKey: " tenants/tenant-1/files/file-1 ",
    });
    expect(file.originalFilename).toBe("invoice.pdf");
    expect(file.contentType).toBe("application/pdf");
    expect(file.storageKey).toBe("tenants/tenant-1/files/file-1");
  });

  it("rejects an empty original filename", () => {
    expect(() => FileObject.create({ ...baseProps(), originalFilename: "  " })).toThrow(
      "File original filename is required.",
    );
  });

  it("rejects an empty content type", () => {
    expect(() => FileObject.create({ ...baseProps(), contentType: "  " })).toThrow(
      "File content type is required.",
    );
  });

  it("rejects an empty storage key", () => {
    expect(() => FileObject.create({ ...baseProps(), storageKey: "  " })).toThrow(
      "File storage key is required.",
    );
  });

  it("rejects a zero or negative size", () => {
    expect(() => FileObject.create({ ...baseProps(), sizeBytes: 0n })).toThrow(
      "File size must be greater than zero bytes.",
    );
  });

  it("rejects a companyId without a tenantId", () => {
    expect(() =>
      FileObject.create({ ...baseProps(), tenantId: "", companyId: "company-1" }),
    ).toThrow("A file scoped to a company must also carry a tenantId.");
  });

  it("marks a file deleted", () => {
    const file = FileObject.create(baseProps());
    const now = new Date("2026-08-27T01:00:00.000Z");
    file.markDeleted(now);
    expect(file.status).toBe("DELETED");
    expect(file.deletedAt).toEqual(now);
  });

  it("is idempotent when deleted twice", () => {
    const file = FileObject.create(baseProps());
    const firstDeletedAt = new Date("2026-08-27T01:00:00.000Z");
    const secondDeletedAt = new Date("2026-08-27T02:00:00.000Z");
    file.markDeleted(firstDeletedAt);
    file.markDeleted(secondDeletedAt);
    expect(file.deletedAt).toEqual(firstDeletedAt);
  });

  it("round-trips through toProps", () => {
    const props = baseProps();
    const file = FileObject.create(props);
    expect(file.toProps()).toEqual(props);
  });
});
