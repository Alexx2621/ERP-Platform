import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { FileObject } from "../../domain/file-object.entity";
import { FILE_OBJECT_REPOSITORY, FileObjectRepository } from "../../domain/file-object.repository";
import { FILE_STORAGE, FileStoragePort } from "../ports/file-storage.port";
import { EmptyFileError, FileTooLargeError } from "../errors";

export interface UploadFileInput {
  tenantId: string;
  companyId: string | null;
  ownerUserId: string;
  originalFilename: string;
  contentType: string;
  buffer: Buffer;
  maxSizeBytes: number;
}

/**
 * Uploads to storage BEFORE persisting metadata, deliberately: if the DB
 * write then fails, the result is an orphaned object in the bucket (harmless
 * — nothing references it), never a FileObject row that claims a storage
 * key which was never actually written.
 */
@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(FILE_OBJECT_REPOSITORY) private readonly files: FileObjectRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStoragePort,
  ) {}

  async execute(input: UploadFileInput): Promise<FileObject> {
    const sizeBytes = BigInt(input.buffer.byteLength);
    if (sizeBytes === 0n) throw new EmptyFileError();
    if (input.buffer.byteLength > input.maxSizeBytes) throw new FileTooLargeError(input.maxSizeBytes);

    const id = newId();
    const storageKey = `tenants/${input.tenantId}/files/${id}`;

    await this.storage.putObject({ key: storageKey, body: input.buffer, contentType: input.contentType });

    const file = FileObject.create({
      id,
      tenantId: input.tenantId,
      companyId: input.companyId,
      ownerUserId: input.ownerUserId,
      storageKey,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes,
      status: "ACTIVE",
      createdAt: new Date(),
      deletedAt: null,
    });

    await this.files.save(file);
    return file;
  }
}
