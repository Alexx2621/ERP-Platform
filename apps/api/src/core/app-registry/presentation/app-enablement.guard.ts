import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AppException } from "../../../shared/errors/app.exception";
import { IsAppEnabledForTenantUseCase } from "../application/use-cases/is-app-enabled-for-tenant.use-case";
import { APP_METADATA_KEY } from "./require-app.decorator";

/**
 * Enforces that a business module's app is actually enabled for the
 * caller's tenant before any of its routes run (docs/PLUGINS.md §8: "Un
 * guard central verifica app enablement además de auth/policy") —
 * docs/DECISIONS.md ADR-015 is the first time this is genuinely wired to
 * real controllers, not just designed. Must run after SessionAuthGuard AND
 * TenantContextGuard — it reads `request.tenantContext`, never resolves
 * tenant itself: `@UseGuards(SessionAuthGuard, TenantContextGuard,
 * AppEnablementGuard, PermissionGuard)`. Reads `@RequireApp()` from either
 * the handler or the controller class (`getAllAndOverride`), since every
 * business controller in this codebase applies it once at the class level.
 */
@Injectable()
export class AppEnablementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly isAppEnabled: IsAppEnabledForTenantUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const appKey = this.reflector.getAllAndOverride<string | undefined>(APP_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!appKey) {
      throw new AppException(
        "APP_METADATA_MISSING",
        "AppEnablementGuard applied without @RequireApp().",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = request.tenantContext;
    if (!tenantContext) {
      throw new AppException(
        "APP_ENABLEMENT_GUARD_REQUIRES_TENANT_CONTEXT",
        "AppEnablementGuard must run after TenantContextGuard.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const enabled = await this.isAppEnabled.execute({ tenantId: tenantContext.tenantId, key: appKey });
    if (!enabled) {
      throw new AppException(
        "APP_NOT_ENABLED_FOR_TENANT",
        `App "${appKey}" is not enabled for this tenant.`,
        HttpStatus.FORBIDDEN,
        { key: appKey },
      );
    }
    return true;
  }
}
