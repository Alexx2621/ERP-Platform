export type SessionStatus = "ACTIVE" | "REVOKED";

export interface SessionProps {
  id: string;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  status: SessionStatus;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface RotateTokensInput {
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  now: Date;
}

/**
 * A logged-in session. One row per session; refresh rotates the token pair on
 * the same row rather than issuing a new session (docs/DECISIONS.md ADR-006).
 */
export class Session {
  private constructor(private props: SessionProps) {}

  static create(props: SessionProps): Session {
    return new Session(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get accessTokenHash(): string {
    return this.props.accessTokenHash;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  /** True only when status is ACTIVE; expiry is checked separately by the caller against the relevant token. */
  isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  isAccessTokenExpired(now: Date): boolean {
    return now.getTime() >= this.props.accessExpiresAt.getTime();
  }

  isRefreshTokenExpired(now: Date): boolean {
    return now.getTime() >= this.props.refreshExpiresAt.getTime();
  }

  revoke(now: Date): void {
    this.props.status = "REVOKED";
    this.props.revokedAt = now;
  }

  rotateTokens(input: RotateTokensInput): void {
    this.props.accessTokenHash = input.accessTokenHash;
    this.props.refreshTokenHash = input.refreshTokenHash;
    this.props.accessExpiresAt = input.accessExpiresAt;
    this.props.refreshExpiresAt = input.refreshExpiresAt;
    this.props.lastUsedAt = input.now;
  }

  touch(now: Date): void {
    this.props.lastUsedAt = now;
  }

  toProps(): Readonly<SessionProps> {
    return { ...this.props };
  }
}
