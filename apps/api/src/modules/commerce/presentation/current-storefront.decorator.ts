import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import type { Request } from "express";
import type { Storefront } from "../domain/storefront.entity";
import "./commerce-request";

/** Reads the storefront `PublicStorefrontContextGuard` resolved and attached to the request. Only valid on routes behind that guard. */
export const CurrentStorefront = createParamDecorator((_: unknown, ctx: ExecutionContext): Storefront => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.storefront) {
    throw new InternalServerErrorException("CurrentStorefront used on a route not protected by PublicStorefrontContextGuard.");
  }
  return request.storefront;
});
