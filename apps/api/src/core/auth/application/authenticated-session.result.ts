/** Shared response shape for any use case that hands the caller a live session (login, refresh). */
export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  user: { id: string; email: string; displayName: string };
}
