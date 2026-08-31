import type {
  AcceptMembershipInvitationInput,
  AddProductVariantInput,
  AppConfigurationResponse,
  AppDefinitionResponse,
  AssignRoleInput,
  ApiErrorEnvelope,
  AuditEntryResponse,
  AuthenticatedUser,
  BrandResponse,
  CategoryResponse,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCustomerInput,
  CreateProductInput,
  CreateRoleInput,
  CreateSupplierInput,
  CreateUnitOfMeasureInput,
  CustomerResponse,
  EffectiveSettingResponse,
  InviteMembershipInput,
  LoginInput,
  MembershipResponse,
  MembershipWithUserResponse,
  PendingInvitationResponse,
  PermissionResponse,
  PlatformSettingResponse,
  PlatformSettingValueResponse,
  PlatformUserResponse,
  ProductResponse,
  ProductVariantResponse,
  ProvisionTenantInput,
  ProvisionTenantResponse,
  RegisterInput,
  RoleAssignmentResponse,
  RoleResponse,
  SetAppConfigurationInput,
  SetCustomerStatusInput,
  SetMasterDataStatusInput,
  SetPlatformSettingValueInput,
  SetPlatformUserStatusInput,
  SetProductStatusInput,
  SetProductVariantStatusInput,
  SetSettingValueInput,
  SetSupplierStatusInput,
  SessionResponse,
  SettingDefinitionResponse,
  SettingValueResponse,
  SupplierResponse,
  TenantAppResponse,
  TenantExecutionContext,
  TenantSummary,
  UnitOfMeasureResponse,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateProductInput,
  UpdateProductVariantInput,
  UpdateSupplierInput,
  UpdateUnitOfMeasureInput,
  UserPreferenceResponse,
} from "./contracts.js";

const DEFAULT_API_BASE_URL = "/api/v1";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
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

  async inviteMembership(
    accessToken: string,
    tenantSlug: string,
    input: InviteMembershipInput,
  ): Promise<MembershipWithUserResponse> {
    return this.request<MembershipWithUserResponse>("/tenants/memberships", {
      method: "POST",
      accessToken,
      tenantSlug,
      body: input,
    });
  }

  async listMemberships(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<MembershipWithUserResponse[]> {
    return this.request<MembershipWithUserResponse[]>("/tenants/memberships", {
      accessToken,
      tenantSlug,
      signal,
    });
  }

  async listPendingInvitations(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<PendingInvitationResponse[]> {
    return this.request<PendingInvitationResponse[]>("/tenants/memberships/pending", {
      accessToken,
      signal,
    });
  }

  async revokeMembershipInvitation(accessToken: string, tenantSlug: string, membershipId: string): Promise<void> {
    await this.request<void>(`/tenants/memberships/${encodeURIComponent(membershipId)}`, {
      method: "DELETE",
      accessToken,
      tenantSlug,
    });
  }

  async acceptMembershipInvitation(
    accessToken: string,
    membershipId: string,
    input: AcceptMembershipInvitationInput,
  ): Promise<MembershipResponse> {
    return this.request<MembershipResponse>(
      `/tenants/memberships/${encodeURIComponent(membershipId)}/accept`,
      {
        method: "POST",
        accessToken,
        body: input,
      },
    );
  }

  async listPlatformUsers(
    accessToken: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<PlatformUserResponse[]> {
    const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
    return this.request<PlatformUserResponse[]>(`/platform/users${query}`, { accessToken, signal });
  }

  async setPlatformUserStatus(
    accessToken: string,
    userId: string,
    input: SetPlatformUserStatusInput,
  ): Promise<PlatformUserResponse> {
    return this.request<PlatformUserResponse>(`/platform/users/${encodeURIComponent(userId)}/status`, {
      method: "PUT",
      accessToken,
      body: input,
    });
  }

  async listPlatformSettingDefinitions(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<SettingDefinitionResponse[]> {
    return this.request<SettingDefinitionResponse[]>("/platform/settings/definitions", {
      accessToken,
      signal,
    });
  }

  async listPlatformSettings(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<PlatformSettingResponse[]> {
    return this.request<PlatformSettingResponse[]>("/platform/settings", { accessToken, signal });
  }

  async setPlatformSettingValue(
    accessToken: string,
    key: string,
    input: SetPlatformSettingValueInput,
  ): Promise<PlatformSettingValueResponse> {
    return this.request<PlatformSettingValueResponse>(`/platform/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      accessToken,
      body: input,
    });
  }

  async listPlatformAuditEntries(
    accessToken: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<AuditEntryResponse[]> {
    const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
    return this.request<AuditEntryResponse[]>(`/platform/audit-entries${query}`, { accessToken, signal });
  }

  async listAuditEntries(
    accessToken: string,
    tenantSlug: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<AuditEntryResponse[]> {
    const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
    return this.request<AuditEntryResponse[]>(`/audit-entries${query}`, { accessToken, tenantSlug, signal });
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

  async listAppDefinitions(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<AppDefinitionResponse[]> {
    return this.request<AppDefinitionResponse[]>("/apps/definitions", { accessToken, tenantSlug, signal });
  }

  async listTenantApps(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<TenantAppResponse[]> {
    return this.request<TenantAppResponse[]>("/apps", { accessToken, tenantSlug, signal });
  }

  async enableApp(accessToken: string, tenantSlug: string, key: string): Promise<TenantAppResponse> {
    return this.request<TenantAppResponse>(`/apps/${encodeURIComponent(key)}/enable`, {
      method: "POST",
      accessToken,
      tenantSlug,
    });
  }

  async disableApp(accessToken: string, tenantSlug: string, key: string): Promise<TenantAppResponse> {
    return this.request<TenantAppResponse>(`/apps/${encodeURIComponent(key)}/disable`, {
      method: "POST",
      accessToken,
      tenantSlug,
    });
  }

  async listAppConfiguration(
    accessToken: string,
    tenantSlug: string,
    key: string,
    signal?: AbortSignal,
  ): Promise<AppConfigurationResponse[]> {
    return this.request<AppConfigurationResponse[]>(`/apps/${encodeURIComponent(key)}/configuration`, {
      accessToken,
      tenantSlug,
      signal,
    });
  }

  async setAppConfiguration(
    accessToken: string,
    tenantSlug: string,
    key: string,
    configKey: string,
    input: SetAppConfigurationInput,
  ): Promise<AppConfigurationResponse> {
    return this.request<AppConfigurationResponse>(
      `/apps/${encodeURIComponent(key)}/configuration/${encodeURIComponent(configKey)}`,
      {
        method: "PUT",
        accessToken,
        tenantSlug,
        body: input,
      },
    );
  }

  async listUnitsOfMeasure(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<UnitOfMeasureResponse[]> {
    return this.request<UnitOfMeasureResponse[]>("/catalog/units-of-measure", {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createUnitOfMeasure(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateUnitOfMeasureInput,
  ): Promise<UnitOfMeasureResponse> {
    return this.request<UnitOfMeasureResponse>("/catalog/units-of-measure", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateUnitOfMeasure(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateUnitOfMeasureInput,
  ): Promise<UnitOfMeasureResponse> {
    return this.request<UnitOfMeasureResponse>(`/catalog/units-of-measure/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setUnitOfMeasureStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetMasterDataStatusInput,
  ): Promise<UnitOfMeasureResponse> {
    return this.request<UnitOfMeasureResponse>(`/catalog/units-of-measure/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listCategories(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<CategoryResponse[]> {
    return this.request<CategoryResponse[]>("/catalog/categories", { accessToken, tenantSlug, companyId, signal });
  }

  async createCategory(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateCategoryInput,
  ): Promise<CategoryResponse> {
    return this.request<CategoryResponse>("/catalog/categories", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateCategory(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryResponse> {
    return this.request<CategoryResponse>(`/catalog/categories/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setCategoryStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetMasterDataStatusInput,
  ): Promise<CategoryResponse> {
    return this.request<CategoryResponse>(`/catalog/categories/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listBrands(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<BrandResponse[]> {
    return this.request<BrandResponse[]>("/catalog/brands", { accessToken, tenantSlug, companyId, signal });
  }

  async createBrand(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateBrandInput,
  ): Promise<BrandResponse> {
    return this.request<BrandResponse>("/catalog/brands", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateBrand(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateBrandInput,
  ): Promise<BrandResponse> {
    return this.request<BrandResponse>(`/catalog/brands/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setBrandStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetMasterDataStatusInput,
  ): Promise<BrandResponse> {
    return this.request<BrandResponse>(`/catalog/brands/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listProducts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<ProductResponse[]> {
    return this.request<ProductResponse[]>("/products", { accessToken, tenantSlug, companyId, signal });
  }

  async createProduct(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateProductInput,
  ): Promise<ProductResponse> {
    return this.request<ProductResponse>("/products", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateProduct(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductResponse> {
    return this.request<ProductResponse>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setProductStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetProductStatusInput,
  ): Promise<ProductResponse> {
    return this.request<ProductResponse>(`/products/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listProductVariants(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    productId: string,
    signal?: AbortSignal,
  ): Promise<ProductVariantResponse[]> {
    return this.request<ProductVariantResponse[]>(`/products/${encodeURIComponent(productId)}/variants`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addProductVariant(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    productId: string,
    input: AddProductVariantInput,
  ): Promise<ProductVariantResponse> {
    return this.request<ProductVariantResponse>(`/products/${encodeURIComponent(productId)}/variants`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateProductVariant(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput,
  ): Promise<ProductVariantResponse> {
    return this.request<ProductVariantResponse>(
      `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      { method: "PUT", accessToken, tenantSlug, companyId, body: input },
    );
  }

  async setProductVariantStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    productId: string,
    variantId: string,
    input: SetProductVariantStatusInput,
  ): Promise<ProductVariantResponse> {
    return this.request<ProductVariantResponse>(
      `/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/status`,
      { method: "PUT", accessToken, tenantSlug, companyId, body: input },
    );
  }

  async listCustomers(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<CustomerResponse[]> {
    return this.request<CustomerResponse[]>("/customers", { accessToken, tenantSlug, companyId, signal });
  }

  async createCustomer(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateCustomerInput,
  ): Promise<CustomerResponse> {
    return this.request<CustomerResponse>("/customers", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateCustomer(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customers/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setCustomerStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetCustomerStatusInput,
  ): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customers/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listSuppliers(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<SupplierResponse[]> {
    return this.request<SupplierResponse[]>("/suppliers", { accessToken, tenantSlug, companyId, signal });
  }

  async createSupplier(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateSupplierInput,
  ): Promise<SupplierResponse> {
    return this.request<SupplierResponse>("/suppliers", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateSupplier(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateSupplierInput,
  ): Promise<SupplierResponse> {
    return this.request<SupplierResponse>(`/suppliers/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setSupplierStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetSupplierStatusInput,
  ): Promise<SupplierResponse> {
    return this.request<SupplierResponse>(`/suppliers/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
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
