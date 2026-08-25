import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import type { Request } from "express";
import type { AuthContext } from "./auth-request";

/** Reads the auth context SessionAuthGuard attached to the request. Only valid on routes behind that guard. */
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.authContext) {
    throw new InternalServerErrorException(
      "CurrentAuth used on a route not protected by SessionAuthGuard.",
    );
  }
  return request.authContext;
});
