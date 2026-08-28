import { Inject, Injectable } from "@nestjs/common";
import { FileObject } from "../../domain/file-object.entity";
import { FILE_OBJECT_REPOSITORY, FileObjectRepository } from "../../domain/file-object.repository";

export interface ListFilesInput {
  tenantId: string;
  companyId?: string | null;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class ListFilesUseCase {
  constructor(@Inject(FILE_OBJECT_REPOSITORY) private readonly files: FileObjectRepository) {}

  execute(input: ListFilesInput): Promise<FileObject[]> {
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.files.findByTenant({ tenantId: input.tenantId, companyId: input.companyId, limit });
  }
}
