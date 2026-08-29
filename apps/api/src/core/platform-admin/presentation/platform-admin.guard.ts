import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppException } from "../../../shared/errors/app.exception";
import type { AuthContext } from "../../auth";

/**
 * Deny-by-default gate for `/api/v1/platform/*`. Must run after
 * `SessionAuthGuard` — reads `request.authContext.user.isPlatformAdmin`
 * rather than re-authenticating (`@UseGuards(SessionAuthGuard, PlatformAdminGuard)`).
 *
 * There is deliberately no separate identity/credential system for platform
 * admins (docs/DECISIONS.md ADR-007): the same User/Session infrastructure
 * (Argon2id, opaque sessions) is reused, and this guard is the only
 * additional check — "system administration usa un plano ... separado"
 * (docs/ARCHITECTURE.md §10) is satisfied by the distinct `/platform` route
 * prefix and this guard, not by a distinct auth stack.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authContext = request.authContext as AuthContext | undefined;

    if (!authContext) {
      throw new AppException(
        "PLATFORM_ADMIN_GUARD_REQUIRES_AUTH",
        "PlatformAdminGuard must run after SessionAuthGuard.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!authContext.user.isPlatformAdmin) {
      throw new AppException(
        "PLATFORM_ADMIN_REQUIRED",
        "This action requires platform administrator privileges.",
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
