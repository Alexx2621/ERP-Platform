import { Inject, Injectable } from "@nestjs/common";
import { SESSION_REPOSITORY, SessionRepository } from "../../domain/session.repository";
import { CLOCK, Clock } from "../ports/clock.port";

/** Revokes every active session for a user — "log out everywhere", and the hook a future UserDisabled flow can call. */
@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<void> {
    const now = this.clock.now();
    const activeSessions = await this.sessions.findActiveByUserId(userId);
    for (const session of activeSessions) {
      session.revoke(now);
      await this.sessions.save(session);
    }
  }
}
