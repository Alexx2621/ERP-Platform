import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { CLOCK, Clock } from "./ports/clock.port";
import { TOKEN_GENERATOR, TokenGenerator } from "./ports/token-generator.port";

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/** Shared by Login and RefreshSession so token issuance rules live in exactly one place. */
@Injectable()
export class TokenIssuer {
  constructor(
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  issue(): IssuedTokenPair {
    const now = this.clock.now();
    const accessTtlSeconds = this.config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true });
    const refreshTtlSeconds = this.config.get("REFRESH_TOKEN_TTL_SECONDS", { infer: true });

    const accessToken = this.tokens.generateToken();
    const refreshToken = this.tokens.generateToken();

    return {
      accessToken,
      refreshToken,
      accessTokenHash: this.tokens.hashToken(accessToken),
      refreshTokenHash: this.tokens.hashToken(refreshToken),
      accessExpiresAt: new Date(now.getTime() + accessTtlSeconds * 1000),
      refreshExpiresAt: new Date(now.getTime() + refreshTtlSeconds * 1000),
    };
  }
}
