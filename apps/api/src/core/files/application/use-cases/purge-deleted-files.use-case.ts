import { Inject, Injectable, Logger } from "@nestjs/common";
import { FILE_OBJECT_REPOSITORY, FileObjectRepository } from "../../domain/file-object.repository";
import { FILE_STORAGE, FileStoragePort } from "../ports/file-storage.port";

export interface PurgeDeletedFilesInput {
  retentionDays: number;
  batchSize: number;
  now?: Date;
}

export interface PurgeDeletedFilesResult {
  purged: number;
  failed: number;
}

/**
 * The real storage cleanup `DeleteFileUseCase` always deferred
 * (docs/SECURITY.md "Files"): finds DELETED files past the retention
 * window, deletes their actual S3/MinIO object, then marks the metadata row
 * PURGED. A per-file storage failure is logged and skipped, not fatal to
 * the batch — one bad object must not block every other real purge that
 * tick (same "don't let one failure abort the whole batch" reasoning as
 * DomainEventBus.publish's handler isolation).
 */
@Injectable()
export class PurgeDeletedFilesUseCase {
  private readonly logger = new Logger(PurgeDeletedFilesUseCase.name);

  constructor(
    @Inject(FILE_OBJECT_REPOSITORY) private readonly files: FileObjectRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStoragePort,
  ) {}

  async execute(input: PurgeDeletedFilesInput): Promise<PurgeDeletedFilesResult> {
    const now = input.now ?? new Date();
    const cutoff = new Date(now.getTime() - input.retentionDays * 24 * 60 * 60 * 1000);
    const candidates = await this.files.findDeletedBefore(cutoff, input.batchSize);

    let purged = 0;
    let failed = 0;
    for (const file of candidates) {
      try {
        await this.storage.deleteObject(file.storageKey);
        file.markPurged(now);
        await this.files.save(file);
        purged += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to purge file ${file.id} (storageKey=${file.storageKey})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { purged, failed };
  }
}
