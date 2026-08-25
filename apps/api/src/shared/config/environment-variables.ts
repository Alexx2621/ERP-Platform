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
