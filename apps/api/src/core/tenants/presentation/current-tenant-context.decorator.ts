import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import type { Request } from "express";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/** Reads the context TenantContextGuard attached to the request. Only valid on routes behind that guard. */
export const CurrentTenantContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantExecutionContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.tenantContext) {
      throw new InternalServerErrorException(
        "CurrentTenantContext used on a route not protected by TenantContextGuard.",
      );
    }
    return request.tenantContext;
  },
);
