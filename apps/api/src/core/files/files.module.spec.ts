import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { FilesModule } from "./files.module";
import { FilesController } from "./presentation/files.controller";
import { UploadFileUseCase } from "./application/use-cases/upload-file.use-case";
import { GetFileDownloadUrlUseCase } from "./application/use-cases/get-file-download-url.use-case";
import { ListFilesUseCase } from "./application/use-cases/list-files.use-case";
import { DeleteFileUseCase } from "./application/use-cases/delete-file.use-case";

// FilesModule imports AuthModule + TenantsModule (for their guards) and
// AccessControlModule (for PermissionGuard) — same StubInfraModule pattern
// as configuration.module.spec.ts, since those modules ultimately need
// Prisma/Redis. S3FileStorageAdapter/S3BucketBootstrapper only build an
// S3Client in their constructor (no network call happens there), and
// S3BucketBootstrapper's onModuleInit is never triggered by `.compile()`
// alone (only `.init()` runs lifecycle hooks) — so no real MinIO connection
// is needed for this test.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: RedisService, useValue: {} },
    { provide: NOTIFICATIONS_PRISMA_CLIENT, useExisting: PrismaService },
  ],
  exports: [PrismaService, RedisService, NOTIFICATIONS_PRISMA_CLIENT],
})
class StubInfraModule {}

describe("FilesModule wiring", () => {
  it("resolves every file use case and the controller", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              LOGIN_RATE_LIMIT_MAX: 5,
              LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
              ACCESS_TOKEN_TTL_SECONDS: 900,
              REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
              FILES_S3_ENDPOINT: "http://localhost:9000",
              FILES_S3_REGION: "us-east-1",
              FILES_S3_ACCESS_KEY_ID: "test",
              FILES_S3_SECRET_ACCESS_KEY: "test",
              FILES_S3_BUCKET: "test-bucket",
              FILES_S3_FORCE_PATH_STYLE: "true",
              FILES_MAX_SIZE_BYTES: 26_214_400,
              FILES_DOWNLOAD_URL_TTL_SECONDS: 300,
            }),
          ],
        }),
        StubInfraModule,
        FilesModule,
      ],
    }).compile();

    expect(moduleRef.get(UploadFileUseCase)).toBeInstanceOf(UploadFileUseCase);
    expect(moduleRef.get(GetFileDownloadUrlUseCase)).toBeInstanceOf(GetFileDownloadUrlUseCase);
    expect(moduleRef.get(ListFilesUseCase)).toBeInstanceOf(ListFilesUseCase);
    expect(moduleRef.get(DeleteFileUseCase)).toBeInstanceOf(DeleteFileUseCase);
    expect(moduleRef.get(FilesController)).toBeInstanceOf(FilesController);

    await moduleRef.close();
  });
});
