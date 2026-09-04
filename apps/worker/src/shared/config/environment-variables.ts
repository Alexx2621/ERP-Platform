import { plainToInstance } from "class-transformer";
import { IsInt, IsString, Min, validateSync } from "class-validator";

/**
 * Deliberately a small subset of `apps/api`'s `EnvironmentVariables` — this
 * process only ever runs the outbox dispatcher (ADR-004's amendment), so it
 * has no reason to know about auth tokens, rate limits or S3 config.
 */
export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number = 3001;

  @IsString()
  DATABASE_URL!: string;

  /** How often the outbox dispatcher polls for pending messages (docs/EVENTS.md §8.2). */
  @IsInt()
  @Min(100)
  OUTBOX_DISPATCH_INTERVAL_MS: number = 2000;

  /** How often the outbox purge job runs (docs/EVENTS.md §8.2: retention/purge as an audited operational job). */
  @IsInt()
  @Min(1000)
  OUTBOX_PURGE_INTERVAL_MS: number = 3_600_000;

  /** How long a PUBLISHED outbox row survives before it becomes eligible for purge. */
  @IsInt()
  @Min(1)
  OUTBOX_PURGE_RETENTION_DAYS: number = 30;

  /** Max rows the purge job deletes per tick. */
  @IsInt()
  @Min(1)
  OUTBOX_PURGE_BATCH_SIZE: number = 500;
}

/**
 * Fails fast on boot if required environment variables are missing or malformed,
 * instead of surfacing confusing errors deep inside the dispatcher later.
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
