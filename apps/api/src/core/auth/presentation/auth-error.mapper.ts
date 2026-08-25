import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  AccountDisabledError,
  InvalidCredentialsError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../application/errors";

/**
 * Translates auth domain/application errors into the standard HTTP error
 * envelope. Unknown errors are rethrown unchanged so they surface as 500s
 * through the global filter instead of being silently swallowed.
 */
export function handleAuthError(error: unknown): never {
  if (error instanceof InvalidCredentialsError) {
    throw new AppException("INVALID_CREDENTIALS", error.message, HttpStatus.UNAUTHORIZED);
  }
  if (error instanceof AccountDisabledError) {
    throw new AppException("ACCOUNT_DISABLED", error.message, HttpStatus.FORBIDDEN);
  }
  if (error instanceof SessionNotFoundError) {
    throw new AppException("UNAUTHENTICATED", error.message, HttpStatus.UNAUTHORIZED);
  }
  if (error instanceof SessionExpiredError) {
    throw new AppException("SESSION_EXPIRED", error.message, HttpStatus.UNAUTHORIZED);
  }
  if (error instanceof SessionRevokedError) {
    throw new AppException("SESSION_REVOKED", error.message, HttpStatus.UNAUTHORIZED);
  }
  throw error;
}
