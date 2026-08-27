import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AppException } from "../../../shared/errors/app.exception";
import { HasPermissionUseCase } from "../application/use-cases/has-permission.use-case";
import { PermissionDeniedError } from "../application/errors";
import { handleAccessControlError } from "./access-control-error.mapper";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator";

/**
 * Enforces `role_assignment.covers_scope AND permission.granted`
 * (docs/MULTITENANCY.md §9.3). Must run after SessionAuthGuard AND
 * TenantContextGuard — it reads `request.tenantContext`, never resolves
 * tenant/membership itself:
 * `@UseGuards(SessionAuthGuard, TenantContextGuard, PermissionGuard)`.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionKey = this.reflector.get<string | undefined>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    );
    if (!permissionKey) {
      throw new AppException(
        "PERMISSION_METADATA_MISSING",
        "PermissionGuard applied without @RequirePermission().",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = request.tenantContext;
    if (!tenantContext) {
      throw new AppException(
        "PERMISSION_GUARD_REQUIRES_TENANT_CONTEXT",
        "PermissionGuard must run after TenantContextGuard.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const granted = await this.hasPermission.execute({
      tenantId: tenantContext.tenantId,
      membershipId: tenantContext.membershipId,
      companyId: tenantContext.companyId,
      permissionKey,
    });

    if (!granted) {
      handleAccessControlError(new PermissionDeniedError(permissionKey));
    }
    return true;
  }
}
