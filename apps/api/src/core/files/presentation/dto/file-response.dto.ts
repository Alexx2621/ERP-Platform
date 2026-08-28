import type { FileObject } from "../../domain/file-object.entity";
import type { FileDownloadUrl } from "../../application/use-cases/get-file-download-url.use-case";

export class FileObjectResponseDto {
  id!: string;
  companyId!: string | null;
  ownerUserId!: string;
  originalFilename!: string;
  contentType!: string;
  /** Serialized as a string — `bigint` has no native JSON representation. */
  sizeBytes!: string;
  status!: string;
  createdAt!: string;

  static fromDomain(file: FileObject): FileObjectResponseDto {
    const dto = new FileObjectResponseDto();
    dto.id = file.id;
    dto.companyId = file.companyId;
    dto.ownerUserId = file.ownerUserId;
    dto.originalFilename = file.originalFilename;
    dto.contentType = file.contentType;
    dto.sizeBytes = file.sizeBytes.toString();
    dto.status = file.status;
    dto.createdAt = file.createdAt.toISOString();
    return dto;
  }
}

export class FileDownloadUrlResponseDto {
  url!: string;
  expiresInSeconds!: number;

  static fromDomain(result: FileDownloadUrl): FileDownloadUrlResponseDto {
    const dto = new FileDownloadUrlResponseDto();
    dto.url = result.url;
    dto.expiresInSeconds = result.expiresInSeconds;
    return dto;
  }
}
