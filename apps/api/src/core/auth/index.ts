/** Public contract of the Auth module. Other modules must only import from here. */
export { AuthModule } from "./auth.module";
export { SessionAuthGuard } from "./presentation/session-auth.guard";
export { CurrentAuth } from "./presentation/current-user.decorator";
export type { AuthContext } from "./presentation/auth-request";
export { SetPasswordUseCase } from "./application/use-cases/set-password.use-case";
export { RevokeAllSessionsUseCase } from "./application/use-cases/revoke-all-sessions.use-case";
export type { AuthenticatedSession } from "./application/authenticated-session.result";
export {
  InvalidCredentialsError,
  AccountDisabledError,
  SessionNotFoundError,
  SessionExpiredError,
  SessionRevokedError,
} from "./application/errors";
