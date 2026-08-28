import { Inject, Injectable } from "@nestjs/common";
import { FileObject } from "../../domain/file-object.entity";
import { FILE_OBJECT_REPOSITORY, FileObjectRepository } from "../../domain/file-object.repository";
import { FILE_STORAGE, FileStoragePort } from "../ports/file-storage.port";
import { FileNotFoundError } from "../errors";

export interface GetFileDownloadUrlInput {
  fileId: string;
  tenantId: string;
  ttlSeconds: number;
}

export interface FileDownloadUrl {
  file: FileObject;
  url: string;
  expiresInSeconds: number;
}

/**
 * Verifies tenant ownership before ever calling the storage adapter — a
 * signed URL is only issued for a file that actually belongs to the caller's
 * tenant (docs/ARCHITECTURE.md §10: "verificación de ownership/tenant antes
 * de emitir[las]"). A deleted file is treated as not found: its storage
 * object may already be gone or scheduled for cleanup.
 */
@Injectable()
export class GetFileDownloadUrlUseCase {
  constructor(
    @Inject(FILE_OBJECT_REPOSITORY) private readonly files: FileObjectRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStoragePort,
  ) {}

  async execute(input: GetFileDownloadUrlInput): Promise<FileDownloadUrl> {
    const file = await this.files.findById(input.fileId);
    if (!file || file.tenantId !== input.tenantId || file.status === "DELETED") {
      throw new FileNotFoundError();
    }
    const url = await this.storage.getSignedDownloadUrl(file.storageKey, input.ttlSeconds);
    return { file, url, expiresInSeconds: input.ttlSeconds };
  }
}
