import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { UsersModule } from "../users";
import type { EnvironmentVariables } from "../../shared/config/environment-variables";
import { CREDENTIAL_REPOSITORY } from "./domain/credential.repository";
import { SESSION_REPOSITORY } from "./domain/session.repository";
import { PASSWORD_HASHER } from "./application/ports/password-hasher.port";
import { TOKEN_GENERATOR } from "./application/ports/token-generator.port";
import { CLOCK } from "./application/ports/clock.port";
import { PrismaCredentialRepository } from "./infrastructure/prisma-credential.repository";
import { PrismaSessionRepository } from "./infrastructure/prisma-session.repository";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher";
import { CryptoTokenGenerator } from "./infrastructure/crypto-token-generator";
import { SystemClock } from "./infrastructure/system-clock";
import { TokenIssuer } from "./application/token-issuer";
import { SetPasswordUseCase } from "./application/use-cases/set-password.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { RefreshSessionUseCase } from "./application/use-cases/refresh-session.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { RevokeAllSessionsUseCase } from "./application/use-cases/revoke-all-sessions.use-case";
import { ValidateSessionUseCase } from "./application/use-cases/validate-session.use-case";
import { AuthController } from "./presentation/auth.controller";
import { SessionAuthGuard } from "./presentation/session-auth.guard";

@Module({
  imports: [
    UsersModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        {
          ttl: config.get("LOGIN_RATE_LIMIT_WINDOW_SECONDS", { infer: true }) * 1000,
          limit: config.get("LOGIN_RATE_LIMIT_MAX", { infer: true }),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: CREDENTIAL_REPOSITORY, useClass: PrismaCredentialRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: CLOCK, useClass: SystemClock },
    TokenIssuer,
    SetPasswordUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    RevokeAllSessionsUseCase,
    ValidateSessionUseCase,
    SessionAuthGuard,
  ],
  exports: [SessionAuthGuard, ValidateSessionUseCase, SetPasswordUseCase, RevokeAllSessionsUseCase],
})
export class AuthModule {}
