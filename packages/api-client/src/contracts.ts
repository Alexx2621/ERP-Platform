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

export interface ApiErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}
