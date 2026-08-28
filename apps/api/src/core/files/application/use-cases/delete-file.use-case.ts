import { Inject, Injectable } from "@nestjs/common";
import { FileObject } from "../../domain/file-object.entity";
import { FILE_OBJECT_REPOSITORY, FileObjectRepository } from "../../domain/file-object.repository";
import { FileNotFoundError } from "../errors";

export interface DeleteFileInput {
  fileId: string;
  tenantId: string;
}

/**
 * Soft-delete only (MASTER_SPEC §33): marks the row DELETED but does not
 * synchronously delete the underlying storage object. See docs/SECURITY.md
 * "Files" for the retention/cleanup gap this deliberately leaves for later.
 */
@Injectable()
export class DeleteFileUseCase {
  constructor(@Inject(FILE_OBJECT_REPOSITORY) private readonly files: FileObjectRepository) {}

  async execute(input: DeleteFileInput): Promise<FileObject> {
    const file = await this.files.findById(input.fileId);
    if (!file || file.tenantId !== input.tenantId) throw new FileNotFoundError();
    file.markDeleted(new Date());
    await this.files.save(file);
    return file;
  }
}
