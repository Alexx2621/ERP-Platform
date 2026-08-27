export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: AuthenticatedUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export interface TenantSummary {
  tenantId: string;
  slug: string;
  name: string;
  membershipId: string;
}

export interface TenantExecutionContext {
  tenantId: string;
  membershipId: string;
  companyId?: string;
}

export interface ProvisionTenantInput {
  slug: string;
  name: string;
  organization: {
    code: string;
    name: string;
  };
  company?: {
    code: string;
    name: string;
  };
}

export interface ProvisionTenantResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
  membership: {
    id: string;
    status: string;
  };
  organization: {
    id: string;
    code: string;
    name: string;
  };
  company?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface RoleResponse {
  id: string;
  name: string;
  isSystem: boolean;
  permissionKeys: string[];
}

export interface PermissionResponse {
  key: string;
  description: string;
}

export interface CreateRoleInput {
  name: string;
  permissionKeys: string[];
}

export type RoleAssignmentScope = "TENANT" | "COMPANY";

export interface AssignRoleInput {
  membershipId: string;
  scopeType: RoleAssignmentScope;
  scopeId?: string;
}

export interface RoleAssignmentResponse {
  id: string;
  membershipId: string;
  roleId: string;
  scopeType: RoleAssignmentScope;
  scopeId: string | null;
}

export type SettingDataType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
export type SettingScope = "PLATFORM" | "TENANT" | "COMPANY";
export type WritableSettingScope = Exclude<SettingScope, "PLATFORM">;
export type EffectiveSettingSource = SettingScope | "DEFAULT";

export interface SettingDefinitionResponse {
  key: string;
  dataType: SettingDataType;
  description: string;
  defaultValue: unknown;
  allowedScopes: SettingScope[];
}

export interface EffectiveSettingResponse {
  key: string;
  value: unknown;
  source: EffectiveSettingSource;
}

export interface SetSettingValueInput {
  scopeType: WritableSettingScope;
  companyId?: string;
  value: unknown;
}

export interface SettingValueResponse {
  key: string;
  scopeType: SettingScope;
  companyId: string | null;
  value: unknown;
  updatedAt: string;
}

export interface UserPreferenceResponse {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AuditEntryResponse {
  id: string;
  userId: string | null;
  tenantId: string | null;
  companyId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  previousValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
  createdAt: string;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}
