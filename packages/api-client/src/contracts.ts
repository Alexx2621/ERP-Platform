import type { components } from "./generated/openapi-types.js";

/**
 * Every exported type below is derived from `generated/openapi-types.ts`
 * (regenerate via `pnpm --filter @erp/api-client generate-types` against a
 * running `apps/api`), not hand-duplicated. Two categories are the deliberate
 * exceptions:
 *
 * - Dynamic/polymorphic JSON value fields (`value`, `data`, `previousValues`,
 *   `newValues`, `defaultValue`) render as `Record<string, never>` in the
 *   generated types — OpenAPI/JSON-Schema has no way to honestly express
 *   "any JSON value" — so this file overrides them back to `unknown`, which
 *   is the more correct type for callers.
 * - `ApiErrorEnvelope` describes the global HTTP exception-filter shape, not
 *   a Nest/Swagger DTO, so it has no corresponding schema to derive from.
 */

export type AuthenticatedUser = components["schemas"]["SessionUserDto"];
export type SessionResponse = components["schemas"]["SessionResponseDto"];
export type LoginInput = components["schemas"]["LoginDto"];
export type RegisterInput = components["schemas"]["RegisterDto"];

export type TenantSummary = components["schemas"]["TenantSummaryResponseDto"];
export type TenantExecutionContext = components["schemas"]["TenantExecutionContextResponseDto"];

export type ProvisionTenantInput = components["schemas"]["ProvisionTenantDto"];
export type ProvisionTenantResponse = components["schemas"]["ProvisionedTenantResponseDto"];

export type RoleResponse = components["schemas"]["RoleResponseDto"];
export type PermissionResponse = components["schemas"]["PermissionResponseDto"];
export type CreateRoleInput = components["schemas"]["CreateRoleDto"];

export type RoleAssignmentScope = components["schemas"]["AssignRoleDto"]["scopeType"];
export type AssignRoleInput = components["schemas"]["AssignRoleDto"];
export type RoleAssignmentResponse = components["schemas"]["RoleAssignmentResponseDto"];

export type SettingDataType = components["schemas"]["SettingDefinitionResponseDto"]["dataType"];
export type SettingScope = components["schemas"]["SettingDefinitionResponseDto"]["allowedScopes"][number];
export type WritableSettingScope = Exclude<SettingScope, "PLATFORM">;
export type EffectiveSettingSource = components["schemas"]["EffectiveSettingResponseDto"]["source"];

export type SettingDefinitionResponse = Omit<components["schemas"]["SettingDefinitionResponseDto"], "defaultValue"> & {
  defaultValue: unknown;
};

export type EffectiveSettingResponse = Omit<components["schemas"]["EffectiveSettingResponseDto"], "value"> & {
  value: unknown;
};

export type SetSettingValueInput = Omit<components["schemas"]["SetSettingValueDto"], "value"> & {
  value: unknown;
};

export type SettingValueResponse = Omit<components["schemas"]["SettingValueResponseDto"], "value"> & {
  value: unknown;
};

export type UserPreferenceResponse = Omit<components["schemas"]["UserPreferenceResponseDto"], "value"> & {
  value: unknown;
};

export type MembershipStatus = components["schemas"]["MembershipResponseDto"]["status"];
export type MembershipResponse = components["schemas"]["MembershipResponseDto"];
export type MembershipWithUserResponse = components["schemas"]["MembershipWithUserResponseDto"];
export type PendingInvitationResponse = components["schemas"]["PendingInvitationResponseDto"];
export type InviteMembershipInput = components["schemas"]["InviteMembershipDto"];
export type AcceptMembershipInvitationInput = components["schemas"]["AcceptMembershipInvitationDto"];

export type UserStatus = components["schemas"]["PlatformUserResponseDto"]["status"];
export type PlatformUserResponse = components["schemas"]["PlatformUserResponseDto"];
export type SetPlatformUserStatusInput = components["schemas"]["SetPlatformUserStatusDto"];

export type PlatformSettingSource = components["schemas"]["PlatformSettingResponseDto"]["source"];

export type PlatformSettingResponse = Omit<components["schemas"]["PlatformSettingResponseDto"], "value"> & {
  value: unknown;
};

export type SetPlatformSettingValueInput = Omit<components["schemas"]["SetPlatformSettingValueDto"], "value"> & {
  value: unknown;
};

export type PlatformSettingValueResponse = Omit<components["schemas"]["PlatformSettingValueResponseDto"], "value"> & {
  value: unknown;
};

export type AuditEntryResponse = Omit<components["schemas"]["AuditEntryResponseDto"], "previousValues" | "newValues"> & {
  previousValues: unknown;
  newValues: unknown;
};

export interface ApiErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}
