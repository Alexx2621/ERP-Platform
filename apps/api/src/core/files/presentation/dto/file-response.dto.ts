import { ApiProperty } from "@nestjs/swagger";
import type { FileObject } from "../../domain/file-object.entity";
import type { FileDownloadUrl } from "../../application/use-cases/get-file-download-url.use-case";

export class FileObjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) companyId!: string | null;
  @ApiProperty() ownerUserId!: string;
  @ApiProperty() originalFilename!: string;
  @ApiProperty({ example: "application/pdf" }) contentType!: string;
  @ApiProperty({ description: "bigint serialized as a string — JSON has no native 64-bit integer type.", example: "65536" })
  sizeBytes!: string;
  @ApiProperty({ enum: ["ACTIVE", "DELETED"] }) status!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;

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
  @ApiProperty({ description: "Short-lived signed GET URL against the configured S3-compatible bucket." })
  url!: string;
  @ApiProperty() expiresInSeconds!: number;

  static fromDomain(result: FileDownloadUrl): FileDownloadUrlResponseDto {
    const dto = new FileDownloadUrlResponseDto();
    dto.url = result.url;
    dto.expiresInSeconds = result.expiresInSeconds;
    return dto;
  }
}
