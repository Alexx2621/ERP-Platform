import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, UserRepository } from "../../../users";
import { SESSION_REPOSITORY, SessionRepository } from "../../domain/session.repository";
import { TOKEN_GENERATOR, TokenGenerator } from "../ports/token-generator.port";
import { CLOCK, Clock } from "../ports/clock.port";
import { TokenIssuer } from "../token-issuer";
import { AuthenticatedSession } from "../authenticated-session.result";
import {
  AccountDisabledError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../errors";

export interface RefreshSessionInput {
  refreshToken: string;
}

/**
 * Rotates the token pair in place on the same Session row. A refresh token can
 * only be used once: after rotation the old hash no longer matches any row,
 * so replay of a stale refresh token simply fails as "not found" (ADR-006 —
 * deliberately no reuse-detection/token-family tracking yet, to avoid
 * building machinery Foundation doesn't need).
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute(input: RefreshSessionInput): Promise<AuthenticatedSession> {
    const hash = this.tokens.hashToken(input.refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(hash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    if (!session.isActive()) {
      throw new SessionRevokedError();
    }

    const now = this.clock.now();
    if (session.isRefreshTokenExpired(now)) {
      throw new SessionExpiredError();
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.isActive()) {
      throw new AccountDisabledError();
    }

    const issued = this.tokenIssuer.issue();
    session.rotateTokens({
      accessTokenHash: issued.accessTokenHash,
      refreshTokenHash: issued.refreshTokenHash,
      accessExpiresAt: issued.accessExpiresAt,
      refreshExpiresAt: issued.refreshExpiresAt,
      now,
    });
    await this.sessions.save(session);

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      accessExpiresAt: issued.accessExpiresAt,
      refreshExpiresAt: issued.refreshExpiresAt,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }
}
