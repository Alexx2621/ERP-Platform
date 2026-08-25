import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, User, UserRepository } from "../../../users";
import { Session } from "../../domain/session.entity";
import { SESSION_REPOSITORY, SessionRepository } from "../../domain/session.repository";
import { TOKEN_GENERATOR, TokenGenerator } from "../ports/token-generator.port";
import { CLOCK, Clock } from "../ports/clock.port";
import {
  AccountDisabledError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../errors";

export interface ValidatedSession {
  session: Session;
  user: User;
}

/**
 * Re-checks session AND current user status on every use (not just at login),
 * so disabling a user takes effect on their very next request instead of
 * waiting for a session-revocation event to propagate (docs/DECISIONS.md ADR-006).
 */
@Injectable()
export class ValidateSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(accessToken: string): Promise<ValidatedSession> {
    const hash = this.tokens.hashToken(accessToken);
    const session = await this.sessions.findByAccessTokenHash(hash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    if (!session.isActive()) {
      throw new SessionRevokedError();
    }

    const now = this.clock.now();
    if (session.isAccessTokenExpired(now)) {
      throw new SessionExpiredError();
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.isActive()) {
      throw new AccountDisabledError();
    }

    return { session, user };
  }
}
