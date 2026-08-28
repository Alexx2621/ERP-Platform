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
  ListMyTenantsUseCase,
  type MyTenantSummary,
} from "./application/list-my-tenants.use-case";
export {
  InviteMembershipUseCase,
  type InviteMembershipInput,
  type InvitedMembership,
} from "./application/invite-membership.use-case";
export {
  AcceptMembershipInvitationUseCase,
  type AcceptMembershipInvitationInput,
} from "./application/accept-membership-invitation.use-case";
export {
  ListMembershipsUseCase,
  type MembershipWithUser,
} from "./application/list-memberships.use-case";
export {
  ListPendingInvitationsUseCase,
  type PendingInvitation,
} from "./application/list-pending-invitations.use-case";
export {
  TenantSlugAlreadyInUseError,
  ProvisioningUserUnavailableError,
  TenantContextNotFoundError,
  TenantContextInactiveError,
  MembershipContextInactiveError,
  CompanyContextUnavailableError,
  InvitedUserNotFoundError,
  InvitedUserDisabledError,
  MembershipAlreadyExistsError,
  MembershipNotFoundForUserError,
} from "./application/errors";
export { TenantsModule } from "./tenants.module";
export {
  TenantContextGuard,
  TENANT_SLUG_HEADER,
  COMPANY_ID_HEADER,
} from "./presentation/tenant-context.guard";
export { CurrentTenantContext } from "./presentation/current-tenant-context.decorator";
export { RolesController } from "./presentation/roles.controller";
export { AuditEntriesController } from "./presentation/audit-entries.controller";
export { NotificationsController } from "./presentation/notifications.controller";
export { MembershipsController } from "./presentation/memberships.controller";
export {
  MembershipResponseDto,
  MembershipWithUserResponseDto,
  PendingInvitationResponseDto,
} from "./presentation/dto/membership-response.dto";
