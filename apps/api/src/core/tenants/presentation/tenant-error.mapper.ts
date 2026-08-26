import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextUnavailableError,
  MembershipContextInactiveError,
  ProvisioningUserUnavailableError,
  TenantContextInactiveError,
  TenantContextNotFoundError,
  TenantSlugAlreadyInUseError,
} from "../application/errors";

/** Mirrors core/auth/presentation/auth-error.mapper.ts for the Tenants module's own errors. */
export function handleTenantError(error: unknown): never {
  if (error instanceof TenantContextNotFoundError) {
    throw new AppException("TENANT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof TenantContextInactiveError) {
    throw new AppException("TENANT_INACTIVE", error.message, HttpStatus.FORBIDDEN);
  }
  if (error instanceof MembershipContextInactiveError) {
    throw new AppException("MEMBERSHIP_INACTIVE", error.message, HttpStatus.FORBIDDEN);
  }
  if (error instanceof CompanyContextUnavailableError) {
    throw new AppException("COMPANY_UNAVAILABLE", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof TenantSlugAlreadyInUseError) {
    throw new AppException("TENANT_SLUG_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProvisioningUserUnavailableError) {
    throw new AppException("PROVISIONING_USER_UNAVAILABLE", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
