import { plainToInstance } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min, validateSync } from "class-validator";

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

  /** How long a pending membership invitation stays acceptable before it can be freely reissued. Default 7 days. */
  @IsInt()
  @Min(60)
  MEMBERSHIP_INVITATION_TTL_SECONDS: number = 604_800;

  /** Retention window before a soft-deleted file's storage object is purged for real (docs/SECURITY.md "Files"). Default 30 days. */
  @IsInt()
  @Min(1)
  FILES_PURGE_RETENTION_DAYS: number = 30;

  /** How often the purge scheduler ticks. Default 1 hour. */
  @IsInt()
  @Min(1000)
  FILES_PURGE_INTERVAL_MS: number = 3_600_000;

  /** Max deleted files purged per tick, to bound one batch's blast radius. */
  @IsInt()
  @Min(1)
  FILES_PURGE_BATCH_SIZE: number = 100;

  /**
   * SMTP transport for the Notifications EMAIL channel (`@erp/notifications`'s
   * `SmtpEmailDispatcher`). All optional: when `EMAIL_SMTP_HOST` is unset,
   * the EMAIL channel fails closed with an explanatory reason instead of
   * throwing — same "known limitation, not silently faked" pattern already
   * used for Files/S3. Works with any SMTP-compatible provider (Gmail,
   * SendGrid, Mailgun, Postmark, AWS SES's SMTP interface, a local
   * Mailhog/Mailpit for dev) — this app never picks a vendor SDK.
   */
  @IsOptional()
  @IsString()
  EMAIL_SMTP_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  EMAIL_SMTP_PORT: number = 587;

  @IsOptional()
  @IsIn(["true", "false"])
  EMAIL_SMTP_SECURE: string = "false";

  @IsOptional()
  @IsString()
  EMAIL_SMTP_USER?: string;

  @IsOptional()
  @IsString()
  EMAIL_SMTP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM_ADDRESS?: string;

  /**
   * Rate limit for the public, unauthenticated storefront API (product
   * listing, cart, checkout — docs/ROADMAP.md §11's "Rate limits,
   * anti-abuse e idempotency"). Deliberately separate from
   * `LOGIN_RATE_LIMIT_*`: a shopper browsing/adding-to-cart is a very
   * different traffic shape than a login attempt, and conflating the two
   * windows would either throttle real shoppers or under-protect login.
   */
  @IsInt()
  @Min(1)
  COMMERCE_RATE_LIMIT_MAX: number = 60;

  @IsInt()
  @Min(1)
  COMMERCE_RATE_LIMIT_WINDOW_SECONDS: number = 60;
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
