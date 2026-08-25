import { Session } from "./session.entity";

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByAccessTokenHash(hash: string): Promise<Session | null>;
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  save(session: Session): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");
