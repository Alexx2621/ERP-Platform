import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { AppException } from "../../../shared/errors/app.exception";
import type { AuthContext } from "../../auth";
import { ResolveTenantContextUseCase } from "../application/resolve-tenant-context.use-case";
import { handleTenantError } from "./tenant-error.mapper";

export const TENANT_SLUG_HEADER = "x-tenant-slug";
export const COMPANY_ID_HEADER = "x-company-id";

/**
 * Resolves the tenant/membership/company scope for a request, per
 * docs/MULTITENANCY.md §6.1. Must run AFTER SessionAuthGuard — it reads
 * `request.authContext` set by that guard rather than re-authenticating.
 * Order matters: `@UseGuards(SessionAuthGuard, TenantContextGuard)`.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly resolveTenantContext: ResolveTenantContextUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authContext = request.authContext as AuthContext | undefined;

    if (!authContext) {
      throw new AppException(
        "TENANT_CONTEXT_REQUIRES_AUTH",
        "TenantContextGuard must run after SessionAuthGuard.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const tenantSlug = request.header(TENANT_SLUG_HEADER);
    if (!tenantSlug) {
      throw new AppException(
        "TENANT_SLUG_REQUIRED",
        `Missing required "${TENANT_SLUG_HEADER}" header.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      request.tenantContext = await this.resolveTenantContext.execute({
        requestId: randomUUID(),
        correlationId: request.correlationId,
        userId: authContext.user.id,
        tenantSlug,
        companyId: request.header(COMPANY_ID_HEADER),
      });
      return true;
    } catch (error) {
      handleTenantError(error);
    }
  }
}
