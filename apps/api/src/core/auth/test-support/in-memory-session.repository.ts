import { Session } from "../domain/session.entity";
import { SessionRepository } from "../domain/session.repository";

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessionsById = new Map<string, Session>();

  async findById(id: string): Promise<Session | null> {
    return this.sessionsById.get(id) ?? null;
  }

  async findByAccessTokenHash(hash: string): Promise<Session | null> {
    return this.find((s) => s.accessTokenHash === hash);
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return this.find((s) => s.refreshTokenHash === hash);
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return [...this.sessionsById.values()].filter(
      (s) => s.userId === userId && s.status === "ACTIVE",
    );
  }

  async save(session: Session): Promise<void> {
    this.sessionsById.set(session.id, session);
  }

  private find(predicate: (session: Session) => boolean): Session | null {
    for (const session of this.sessionsById.values()) {
      if (predicate(session)) return session;
    }
    return null;
  }
}
