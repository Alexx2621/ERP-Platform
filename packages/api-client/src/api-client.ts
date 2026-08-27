import type {
  AssignRoleInput,
  ApiErrorEnvelope,
  AuditEntryResponse,
  AuthenticatedUser,
  CreateRoleInput,
  EffectiveSettingResponse,
  LoginInput,
  PermissionResponse,
  ProvisionTenantInput,
  ProvisionTenantResponse,
  RegisterInput,
  RoleAssignmentResponse,
  RoleResponse,
  SetSettingValueInput,
  SessionResponse,
  SettingDefinitionResponse,
  SettingValueResponse,
  TenantExecutionContext,
  TenantSummary,
  UserPreferenceResponse,
} from "./contracts.js";

const DEFAULT_API_BASE_URL = "/api/v1";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  accessToken?: string;
  tenantSlug?: string;
  companyId?: string;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly correlationId?: string;

  constructor(envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.name = "ApiError";
    this.statusCode = envelope.statusCode;
    this.code = envelope.code;
    this.details = envelope.details;
    this.correlationId = envelope.correlationId;
  }
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiErrorEnvelope>;
  return (
    typeof candidate.statusCode === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
    this.fetchImplementation = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async register(input: RegisterInput): Promise<SessionResponse> {
    return this.request<SessionResponse>("/auth/register", {
      method: "POST",
      body: input,
    });
  }

  async login(input: LoginInput): Promise<SessionResponse> {
    return this.request<SessionResponse>("/auth/login", {
      method: "POST",
      body: input,
    });
  }

  async refresh(refreshToken: string): Promise<SessionResponse> {
    return this.request<SessionResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  }

  async logout(accessToken: string): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
      accessToken,
    });
  }

  async me(accessToken: string): Promise<AuthenticatedUser> {
    return this.request<AuthenticatedUser>("/auth/me", { accessToken });
  }

  async listTenants(accessToken: string, signal?: AbortSignal): Promise<TenantSummary[]> {
    return this.request<TenantSummary[]>("/tenants", { accessToken, signal });
  }

  async provisionTenant(
    accessToken: string,
    input: ProvisionTenantInput,
  ): Promise<ProvisionTenantResponse> {
    return this.request<ProvisionTenantResponse>("/tenants", {
      method: "POST",
      accessToken,
      body: input,
    });
  }

  async getTenantContext(
    accessToken: string,
    tenantSlug: string,
    companyId?: string,
  ): Promise<TenantExecutionContext> {
    return this.request<TenantExecutionContext>("/tenants/current", {
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listRoles(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<RoleResponse[]> {
    return this.request<RoleResponse[]>("/roles", { accessToken, tenantSlug, signal });
  }

  async listPermissions(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<PermissionResponse[]> {
    return this.request<PermissionResponse[]>("/permissions", {
      accessToken,
      tenantSlug,
      signal,
    });
  }

  async createRole(
    accessToken: string,
    tenantSlug: string,
    input: CreateRoleInput,
  ): Promise<RoleResponse> {
    return this.request<RoleResponse>("/roles", {
      method: "POST",
      accessToken,
      tenantSlug,
      body: input,
    });
  }

  async assignRole(
    accessToken: string,
    tenantSlug: string,
    roleId: string,
    input: AssignRoleInput,
  ): Promise<RoleAssignmentResponse> {
    return this.request<RoleAssignmentResponse>(
      `/roles/${encodeURIComponent(roleId)}/assignments`,
      {
        method: "POST",
        accessToken,
        tenantSlug,
        body: input,
      },
    );
  }

  async listSettingDefinitions(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<SettingDefinitionResponse[]> {
    return this.request<SettingDefinitionResponse[]>("/settings/definitions", {
      accessToken,
      tenantSlug,
      signal,
    });
  }

  async listEffectiveSettings(
    accessToken: string,
    tenantSlug: string,
    companyId?: string,
    signal?: AbortSignal,
  ): Promise<EffectiveSettingResponse[]> {
    return this.request<EffectiveSettingResponse[]>("/settings", {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async setSettingValue(
    accessToken: string,
    tenantSlug: string,
    key: string,
    input: SetSettingValueInput,
  ): Promise<SettingValueResponse> {
    return this.request<SettingValueResponse>(`/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      body: input,
    });
  }

  async listUserPreferences(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<UserPreferenceResponse[]> {
    return this.request<UserPreferenceResponse[]>("/preferences", {
      accessToken,
      signal,
    });
  }

  async setUserPreference(
    accessToken: string,
    key: string,
    value: unknown,
  ): Promise<UserPreferenceResponse> {
    return this.request<UserPreferenceResponse>(`/preferences/${encodeURIComponent(key)}`, {
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  async listAuditEntries(
    accessToken: string,
    tenantSlug: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<AuditEntryResponse[]> {
    const query = limit === undefined ? "" : `?limit=${encodeURIComponent(String(limit))}`;
    return this.request<AuditEntryResponse[]>(`/audit-entries${query}`, {
      accessToken,
      tenantSlug,
      signal,
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (options.accessToken) {
      headers.set("Authorization", `Bearer ${options.accessToken}`);
    }
    if (options.tenantSlug) {
      headers.set("X-Tenant-Slug", options.tenantSlug);
    }
    if (options.companyId) {
      headers.set("X-Company-Id", options.companyId);
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError({
        statusCode: 0,
        code: "NETWORK_ERROR",
        message:
          "No fue posible conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.",
      });
    }

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (isApiErrorEnvelope(payload)) {
      throw new ApiError(payload);
    }

    throw new ApiError({
      statusCode: response.status,
      code: "UNEXPECTED_RESPONSE",
      message: "El servicio devolvió una respuesta inesperada.",
    });
  }
}
