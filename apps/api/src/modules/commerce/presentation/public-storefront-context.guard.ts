import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../domain/storefront.repository";
import { StorefrontNotActiveError, StorefrontNotFoundError } from "../application/errors";
import { handleCommerceError } from "./commerce-error.mapper";
import "./commerce-request";

/**
 * Resolves `{ tenantId, companyId, storefrontId }` for a public,
 * unauthenticated request purely from the `:storefrontCode` route param —
 * the "mapping previamente registrado" `docs/ARCHITECTURE.md` §7 requires
 * for any public endpoint, since there is no session and no
 * `X-Tenant-Slug` header to trust here. Never confuses a missing/inactive
 * storefront with an authorization failure — both simply mean "there is no
 * shop here", the same `404`/`409` a shopper would see on a real dead link.
 */
@Injectable()
export class PublicStorefrontContextGuard implements CanActivate {
  constructor(@Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const code = request.params.storefrontCode as string | undefined;

    try {
      if (!code) {
        throw new StorefrontNotFoundError();
      }
      const storefront = await this.storefronts.findByCode(code.trim().toLowerCase());
      if (!storefront) {
        throw new StorefrontNotFoundError();
      }
      if (storefront.status !== "ACTIVE") {
        throw new StorefrontNotActiveError();
      }
      request.storefront = storefront;
      return true;
    } catch (error) {
      handleCommerceError(error);
    }
  }
}
