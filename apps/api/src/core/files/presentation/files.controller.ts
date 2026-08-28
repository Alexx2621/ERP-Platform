import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { SessionAuthGuard } from "../../auth";
import { TenantContextGuard, CurrentTenantContext } from "../../tenants";
import type { TenantExecutionContext } from "../../tenants";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { AppException } from "../../../shared/errors/app.exception";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { UploadFileUseCase } from "../application/use-cases/upload-file.use-case";
import { GetFileDownloadUrlUseCase } from "../application/use-cases/get-file-download-url.use-case";
import { ListFilesUseCase } from "../application/use-cases/list-files.use-case";
import { DeleteFileUseCase } from "../application/use-cases/delete-file.use-case";
import { ListFilesDto } from "./dto/list-files.dto";
import { FileDownloadUrlResponseDto, FileObjectResponseDto } from "./dto/file-response.dto";
import { handleFilesError } from "./files-error.mapper";

/**
 * `FileInterceptor` without a `storage` option defaults to Multer's
 * in-memory storage — the upload buffer never touches local disk
 * (MASTER_SPEC §22: "Nunca depender del almacenamiento local del servidor").
 * `limits.fileSize` here is a coarse framework-level guard against buffering
 * an absurdly large body in process memory (rejected by Nest as a plain 413
 * before the request body is even fully read); the real, configurable
 * business limit (`FILES_MAX_SIZE_BYTES`) is enforced inside
 * UploadFileUseCase and reported through the standard error envelope.
 */
const MULTER_HARD_LIMIT_BYTES = 100 * 1024 * 1024;

@Controller("api/v1/files")
@UseGuards(SessionAuthGuard, TenantContextGuard, PermissionGuard)
export class FilesController {
  private readonly maxSizeBytes: number;
  private readonly downloadUrlTtlSeconds: number;

  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly getFileDownloadUrl: GetFileDownloadUrlUseCase,
    private readonly listFiles: ListFilesUseCase,
    private readonly deleteFile: DeleteFileUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxSizeBytes = config.get("FILES_MAX_SIZE_BYTES", { infer: true });
    this.downloadUrlTtlSeconds = config.get("FILES_DOWNLOAD_URL_TTL_SECONDS", { infer: true });
  }

  @Post()
  @RequirePermission("files.upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MULTER_HARD_LIMIT_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<FileObjectResponseDto> {
    if (!file) {
      throw new AppException("FILE_REQUIRED", 'A "file" field is required.', HttpStatus.BAD_REQUEST);
    }
    try {
      const uploaded = await this.uploadFile.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId ?? null,
        ownerUserId: ctx.actor.userId,
        originalFilename: file.originalname,
        contentType: file.mimetype,
        buffer: file.buffer,
        maxSizeBytes: this.maxSizeBytes,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId: uploaded.companyId,
        action: "file.uploaded",
        resource: "FileObject",
        resourceId: uploaded.id,
        previousValues: null,
        newValues: {
          originalFilename: uploaded.originalFilename,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes.toString(),
        },
        correlationId: ctx.correlationId,
      });
      return FileObjectResponseDto.fromDomain(uploaded);
    } catch (error) {
      handleFilesError(error);
    }
  }

  @Get()
  @RequirePermission("files.read")
  async list(
    @Query() query: ListFilesDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<FileObjectResponseDto[]> {
    const files = await this.listFiles.execute({
      tenantId: ctx.tenantId,
      companyId: query.companyId,
      limit: query.limit,
    });
    return files.map(FileObjectResponseDto.fromDomain);
  }

  @Get(":id/download-url")
  @RequirePermission("files.read")
  async downloadUrl(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<FileDownloadUrlResponseDto> {
    try {
      const result = await this.getFileDownloadUrl.execute({
        fileId: id,
        tenantId: ctx.tenantId,
        ttlSeconds: this.downloadUrlTtlSeconds,
      });
      return FileDownloadUrlResponseDto.fromDomain(result);
    } catch (error) {
      handleFilesError(error);
    }
  }

  @Delete(":id")
  @RequirePermission("files.delete")
  async remove(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<FileObjectResponseDto> {
    try {
      const deleted = await this.deleteFile.execute({ fileId: id, tenantId: ctx.tenantId });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId: deleted.companyId,
        action: "file.deleted",
        resource: "FileObject",
        resourceId: deleted.id,
        previousValues: { status: "ACTIVE" },
        newValues: { status: "DELETED" },
        correlationId: ctx.correlationId,
      });
      return FileObjectResponseDto.fromDomain(deleted);
    } catch (error) {
      handleFilesError(error);
    }
  }
}
