import { ConfigService } from "@nestjs/config";
import { newId } from "@erp/database";
import { User } from "../../users/domain/user.entity";
import { InMemoryUserRepository } from "../../users/test-support/in-memory-user.repository";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { InMemoryCredentialRepository } from "./in-memory-credential.repository";
import { InMemorySessionRepository } from "./in-memory-session.repository";
import { FixedClock } from "./fixed-clock";
import { Argon2PasswordHasher } from "../infrastructure/argon2-password-hasher";
import { CryptoTokenGenerator } from "../infrastructure/crypto-token-generator";
import { TokenIssuer } from "../application/token-issuer";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RefreshSessionUseCase } from "../application/use-cases/refresh-session.use-case";
import { LogoutUseCase } from "../application/use-cases/logout.use-case";
import { RevokeAllSessionsUseCase } from "../application/use-cases/revoke-all-sessions.use-case";
import { ValidateSessionUseCase } from "../application/use-cases/validate-session.use-case";
import { SetPasswordUseCase } from "../application/use-cases/set-password.use-case";

export interface AuthTestContextOverrides {
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
  now?: Date;
}

/**
 * Wires the real use cases against in-memory repositories and the real
 * Argon2/crypto adapters (only Prisma is faked — see docs/ARCHITECTURE.md §12:
 * "Unit: value objects, policies, entidades y reglas deterministas").
 */
export function buildAuthTestContext(overrides: AuthTestContextOverrides = {}) {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new Argon2PasswordHasher();
  const tokens = new CryptoTokenGenerator();
  const clock = new FixedClock(overrides.now ?? new Date("2026-01-01T00:00:00.000Z"));

  const config = new ConfigService<EnvironmentVariables, true>({
    ACCESS_TOKEN_TTL_SECONDS: overrides.accessTokenTtlSeconds ?? 900,
    REFRESH_TOKEN_TTL_SECONDS: overrides.refreshTokenTtlSeconds ?? 2_592_000,
  });

  const tokenIssuer = new TokenIssuer(tokens, clock, config);

  const setPassword = new SetPasswordUseCase(users, credentials, hasher);
  const login = new LoginUseCase(users, credentials, sessions, hasher, clock, tokenIssuer);
  const refresh = new RefreshSessionUseCase(sessions, users, tokens, clock, tokenIssuer);
  const logout = new LogoutUseCase(sessions, tokens, clock);
  const revokeAll = new RevokeAllSessionsUseCase(sessions, clock);
  const validateSession = new ValidateSessionUseCase(sessions, users, tokens, clock);

  async function createActiveUser(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<User> {
    const now = clock.now();
    const user = User.create({
      id: newId(),
      email: input.email.toLowerCase(),
      displayName: input.displayName ?? "Test User",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await users.save(user);
    await setPassword.execute(user.id, input.password);
    return user;
  }

  return {
    users,
    credentials,
    sessions,
    hasher,
    tokens,
    clock,
    setPassword,
    login,
    refresh,
    logout,
    revokeAll,
    validateSession,
    createActiveUser,
  };
}
