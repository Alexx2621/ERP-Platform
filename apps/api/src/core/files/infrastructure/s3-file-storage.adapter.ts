import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { FileStoragePort, PutObjectInput } from "../application/ports/file-storage.port";

/**
 * S3-compatible storage adapter (MinIO locally, S3 in production —
 * MASTER_SPEC §22). `forcePathStyle` is required for MinIO (bucket in the
 * URL path, not a subdomain); set FILES_S3_FORCE_PATH_STYLE=false for a
 * virtual-hosted-style provider like real AWS S3.
 */
@Injectable()
export class S3FileStorageAdapter implements FileStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.bucket = config.get("FILES_S3_BUCKET", { infer: true });
    this.client = new S3Client({
      endpoint: config.get("FILES_S3_ENDPOINT", { infer: true }),
      region: config.get("FILES_S3_REGION", { infer: true }),
      forcePathStyle: config.get("FILES_S3_FORCE_PATH_STYLE", { infer: true }) === "true",
      credentials: {
        accessKeyId: config.get("FILES_S3_ACCESS_KEY_ID", { infer: true }),
        secretAccessKey: config.get("FILES_S3_SECRET_ACCESS_KEY", { infer: true }),
      },
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getSignedDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
