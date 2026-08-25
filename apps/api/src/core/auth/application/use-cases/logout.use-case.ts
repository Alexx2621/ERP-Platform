import { Inject, Injectable } from "@nestjs/common";
import { SESSION_REPOSITORY, SessionRepository } from "../../domain/session.repository";
import { TOKEN_GENERATOR, TokenGenerator } from "../ports/token-generator.port";
import { CLOCK, Clock } from "../ports/clock.port";
import { SessionNotFoundError } from "../errors";

/** Revokes exactly the session tied to the presented access token. Idempotent on an already-revoked session. */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(accessToken: string): Promise<void> {
    const hash = this.tokens.hashToken(accessToken);
    const session = await this.sessions.findByAccessTokenHash(hash);
    if (!session) {
      throw new SessionNotFoundError();
    }

    if (session.isActive()) {
      session.revoke(this.clock.now());
      await this.sessions.save(session);
    }
  }
}
