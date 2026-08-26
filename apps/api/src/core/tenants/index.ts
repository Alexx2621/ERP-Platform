export {
  Tenant,
  InvalidTenantTransitionError,
  type TenantProps,
  type TenantStatus,
} from "./domain/tenant.entity";
export {
  Membership,
  InvalidMembershipTransitionError,
  type MembershipProps,
  type MembershipStatus,
} from "./domain/membership.entity";
export { TENANT_REPOSITORY, type TenantRepository } from "./domain/tenant.repository";
export { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "./domain/membership.repository";
export { normalizeTenantSlug, InvalidTenantSlugError } from "./domain/normalize-tenant-slug";
export {
  ProvisionTenantUseCase,
  type ProvisionTenantInput,
} from "./application/provision-tenant.use-case";
export {
  ResolveTenantContextUseCase,
  type ResolveTenantContextInput,
} from "./application/resolve-tenant-context.use-case";
export {
  TenantExecutionContext,
  type TenantExecutionContextProps,
} from "./application/tenant-execution-context";
export type { ProvisionedTenant } from "./application/ports/tenant-provisioning.repository";
export {
  TenantSlugAlreadyInUseError,
  ProvisioningUserUnavailableError,
  TenantContextNotFoundError,
  TenantContextInactiveError,
  MembershipContextInactiveError,
  CompanyContextUnavailableError,
} from "./application/errors";
export { TenantsModule } from "./tenants.module";
