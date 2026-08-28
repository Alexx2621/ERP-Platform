import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";

/**
 * Creates the configured bucket on boot if it doesn't exist yet, so
 * `docker compose up -d` + first app start is enough for local dev — no
 * manual `mc mb` step. Only treats a 404 from HeadBucket as "missing";
 * any other error (bad credentials, network) propagates and fails startup
 * visibly instead of being swallowed as "assume missing, try to create".
 */
@Injectable()
export class S3BucketBootstrapper implements OnModuleInit {
  private readonly logger = new Logger(S3BucketBootstrapper.name);
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

  async onModuleInit(): Promise<void> {
    if (await this.bucketExists()) return;
    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    this.logger.log(`Created storage bucket "${this.bucket}".`);
  }

  private async bucketExists(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (statusCode === 404) return false;
      throw error;
    }
  }
}
