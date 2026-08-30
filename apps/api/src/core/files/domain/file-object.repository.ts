import type { FileObject } from "./file-object.entity";

export const FILE_OBJECT_REPOSITORY = Symbol("FILE_OBJECT_REPOSITORY");

export interface FindFilesQuery {
  tenantId: string;
  companyId?: string | null;
  limit: number;
}

export interface FileObjectRepository {
  save(file: FileObject): Promise<void>;
  findById(id: string): Promise<FileObject | null>;
  findByTenant(query: FindFilesQuery): Promise<FileObject[]>;
  /** Purge candidates: DELETED files whose `deletedAt` is at or before `cutoff` (PurgeDeletedFilesUseCase). */
  findDeletedBefore(cutoff: Date, limit: number): Promise<FileObject[]>;
}
