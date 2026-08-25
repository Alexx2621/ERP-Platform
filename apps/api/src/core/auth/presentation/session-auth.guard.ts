import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppException } from "../../../shared/errors/app.exception";
import { ValidateSessionUseCase } from "../application/use-cases/validate-session.use-case";
import { extractBearerToken } from "./extract-bearer-token";
import { handleAuthError } from "./auth-error.mapper";

/** Deny-by-default guard: attaches `request.authContext` only once the access token is proven valid. */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly validateSession: ValidateSessionUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.header("authorization"));

    if (!token) {
      throw new AppException(
        "UNAUTHENTICATED",
        "Missing or malformed Authorization header.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const { user, session } = await this.validateSession.execute(token);
      request.authContext = { user, session };
      return true;
    } catch (error) {
      handleAuthError(error);
    }
  }
}
