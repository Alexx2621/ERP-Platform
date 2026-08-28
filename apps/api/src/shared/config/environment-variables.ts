import { plainToInstance } from "class-transformer";
import { IsIn, IsInt, IsString, Min, validateSync } from "class-validator";

export class EnvironmentVariables {
  @IsIn(["development", "test", "production"])
  NODE_ENV: string = "development";

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  /** Access token lifetime. Short-lived by design (ADR-006). */
  @IsInt()
  @Min(60)
  ACCESS_TOKEN_TTL_SECONDS: number = 900;

  /** Refresh token lifetime, extended on each rotation (ADR-006). */
  @IsInt()
  @Min(60)
  REFRESH_TOKEN_TTL_SECONDS: number = 2_592_000;

  /** Max login attempts allowed per window per client, before throttling (MASTER_SPEC §87). */
  @IsInt()
  @Min(1)
  LOGIN_RATE_LIMIT_MAX: number = 5;

  @IsInt()
  @Min(1)
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: number = 60;

  /** S3-compatible endpoint for the Files module (MinIO locally, S3 in production — MASTER_SPEC §22). */
  @IsString()
  FILES_S3_ENDPOINT!: string;

  @IsString()
  FILES_S3_REGION: string = "us-east-1";

  @IsString()
  FILES_S3_ACCESS_KEY_ID!: string;

  @IsString()
  FILES_S3_SECRET_ACCESS_KEY!: string;

  @IsString()
  FILES_S3_BUCKET!: string;

  /** Required for MinIO (bucket-in-path, not subdomain); an AWS S3 deployment would set this to "false". */
  @IsIn(["true", "false"])
  FILES_S3_FORCE_PATH_STYLE: string = "true";

  @IsInt()
  @Min(1)
  FILES_MAX_SIZE_BYTES: number = 26_214_400;

  /** How long a signed download URL stays valid (docs/ARCHITECTURE.md §10: "URLs firmadas de corta duración"). */
  @IsInt()
  @Min(60)
  FILES_DOWNLOAD_URL_TTL_SECONDS: number = 300;
}

/**
 * Fails fast on boot if required environment variables are missing or malformed,
 * instead of surfacing confusing errors deep inside a request handler later.
 */
export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }

  return validatedConfig;
}
