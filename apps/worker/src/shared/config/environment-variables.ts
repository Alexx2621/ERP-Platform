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
