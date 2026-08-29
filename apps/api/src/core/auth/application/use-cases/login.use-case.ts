import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { normalizeEmail, USER_REPOSITORY, UserRepository } from "../../../users";
import { Session } from "../../domain/session.entity";
import { CREDENTIAL_REPOSITORY, CredentialRepository } from "../../domain/credential.repository";
import { SESSION_REPOSITORY, SessionRepository } from "../../domain/session.repository";
import { PASSWORD_HASHER, PasswordHasher } from "../ports/password-hasher.port";
import { CLOCK, Clock } from "../ports/clock.port";
import { TokenIssuer } from "../token-issuer";
import { AccountDisabledError, InvalidCredentialsError } from "../errors";
import { AuthenticatedSession } from "../authenticated-session.result";

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Timing-safety note: password verification always runs (even against a dummy
 * hash when the account doesn't exist) so response time doesn't reveal whether
 * an email is registered. Account-disabled is only reported *after* a correct
 * password, so a wrong-password guess never leaks account status either.
 */
@Injectable()
export class LoginUseCase {
  private dummyHash: Promise<string> | undefined;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CREDENTIAL_REPOSITORY) private readonly credentials: CredentialRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<AuthenticatedSession> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findByEmail(email);
    const credential = user ? await this.credentials.findByUserId(user.id) : null;

    const isPasswordValid = credential
      ? await this.hasher.verify(credential.passwordHash, input.password)
      : await this.verifyAgainstDummyHash(input.password);

    if (!user || !credential || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive()) {
      throw new AccountDisabledError();
    }

    const issued = this.tokenIssuer.issue();
    const now = this.clock.now();
    const session = Session.create({
      id: newId(),
      userId: user.id,
      accessTokenHash: issued.accessTokenHash,
      refreshTokenHash: issued.refreshTokenHash,
      status: "ACTIVE",
      accessExpiresAt: issued.accessExpiresAt,
      refreshExpiresAt: issued.refreshExpiresAt,
      revokedAt: null,
      lastUsedAt: now,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: now,
    });
    await this.sessions.save(session);

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      accessExpiresAt: issued.accessExpiresAt,
      refreshExpiresAt: issued.refreshExpiresAt,
      user: { id: user.id, email: user.email, displayName: user.displayName, isPlatformAdmin: user.isPlatformAdmin },
    };
  }

  private async verifyAgainstDummyHash(password: string): Promise<boolean> {
    if (!this.dummyHash) {
      this.dummyHash = this.hasher.hash("timing-safety-placeholder-password");
    }
    await this.hasher.verify(await this.dummyHash, password);
    return false;
  }
}
