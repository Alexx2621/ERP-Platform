import { AuthenticatedSession } from "../../application/authenticated-session.result";

export class SessionResponseDto {
  accessToken!: string;
  refreshToken!: string;
  accessExpiresAt!: string;
  refreshExpiresAt!: string;
  user!: { id: string; email: string; displayName: string };

  private constructor(props: SessionResponseDto) {
    Object.assign(this, props);
  }

  static fromResult(result: AuthenticatedSession): SessionResponseDto {
    return new SessionResponseDto({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessExpiresAt: result.accessExpiresAt.toISOString(),
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
      user: result.user,
    });
  }
}
