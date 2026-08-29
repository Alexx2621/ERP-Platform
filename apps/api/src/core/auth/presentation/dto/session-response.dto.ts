import { ApiProperty } from "@nestjs/swagger";
import { AuthenticatedSession } from "../../application/authenticated-session.result";

class SessionUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ description: "Grants access to /api/v1/platform/* — see docs/DECISIONS.md ADR-007." })
  isPlatformAdmin!: boolean;
}

export class SessionResponseDto {
  @ApiProperty({ description: "Short-lived bearer token — send as `Authorization: Bearer <token>`." })
  accessToken!: string;

  @ApiProperty({ description: "Long-lived token, single-use — exchange via POST /auth/refresh." })
  refreshToken!: string;

  @ApiProperty({ format: "date-time" })
  accessExpiresAt!: string;

  @ApiProperty({ format: "date-time" })
  refreshExpiresAt!: string;

  @ApiProperty({ type: SessionUserDto })
  user!: SessionUserDto;

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
