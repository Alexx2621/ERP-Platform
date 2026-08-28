import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { TenantsModule } from "../tenants";
import { AccessControlModule } from "../access-control";
import { AuditModule } from "../audit";
import { FILE_OBJECT_REPOSITORY } from "./domain/file-object.repository";
import { PrismaFileObjectRepository } from "./infrastructure/prisma-file-object.repository";
import { FILE_STORAGE } from "./application/ports/file-storage.port";
import { S3FileStorageAdapter } from "./infrastructure/s3-file-storage.adapter";
import { S3BucketBootstrapper } from "./infrastructure/s3-bucket-bootstrapper";
import { UploadFileUseCase } from "./application/use-cases/upload-file.use-case";
import { GetFileDownloadUrlUseCase } from "./application/use-cases/get-file-download-url.use-case";
import { ListFilesUseCase } from "./application/use-cases/list-files.use-case";
import { DeleteFileUseCase } from "./application/use-cases/delete-file.use-case";
import { FilesController } from "./presentation/files.controller";

/**
 * Nothing depends on Files, so — same reasoning as ConfigurationModule —
 * there is no module-loading cycle risk: FilesController can safely import
 * TenantContextGuard/CurrentTenantContext from Tenants and
 * PermissionGuard/RequirePermission from Access Control directly, and live
 * physically in this module's own presentation/ folder.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [FilesController],
  providers: [
    { provide: FILE_OBJECT_REPOSITORY, useClass: PrismaFileObjectRepository },
    { provide: FILE_STORAGE, useClass: S3FileStorageAdapter },
    S3BucketBootstrapper,
    UploadFileUseCase,
    GetFileDownloadUrlUseCase,
    ListFilesUseCase,
    DeleteFileUseCase,
  ],
  exports: [UploadFileUseCase, GetFileDownloadUrlUseCase, ListFilesUseCase, DeleteFileUseCase],
})
export class FilesModule {}
