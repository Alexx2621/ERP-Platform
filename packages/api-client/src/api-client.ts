import type {
  AcceptMembershipInvitationInput,
  AccountLedgerResponse,
  AccountResponse,
  ActivityResponse,
  AddCartLineInput,
  AddPipelineStageInput,
  AddPriceListItemInput,
  AddProductVariantInput,
  AddPurchaseOrderLineInput,
  AddQuoteLineInput,
  AddSalesOrderLineInput,
  AdjustInventoryInput,
  AppConfigurationResponse,
  AppDefinitionResponse,
  AssignRoleInput,
  ApiErrorEnvelope,
  AuditEntryResponse,
  AuthenticatedUser,
  BrandResponse,
  CapturePaymentInput,
  CartResponse,
  CategoryResponse,
  CheckoutInput,
  CloseShiftInput,
  CommerceOrderResponse,
  CompanyResponse,
  ConvertLeadResponse,
  ConvertQuoteInput,
  CreateAccountInput,
  CreateActivityInput,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCustomerInput,
  CreateFiscalPeriodInput,
  CreateJournalEntryInput,
  CreateLeadInput,
  CreateOpportunityInput,
  CreatePipelineInput,
  CreatePosRegisterInput,
  CreatePosReturnInput,
  CreatePriceListInput,
  CreateProductInput,
  CreatePurchaseOrderInput,
  CreatePurchaseReceiptInput,
  CreatePurchaseReturnInput,
  CreateQuoteInput,
  CreateReservationInput,
  CreateRoleInput,
  CreateSalesOrderInput,
  CreateSalesReturnInput,
  CreateStorefrontInput,
  CreateSupplierInput,
  CreateSupplierInvoiceInput,
  CreateTaxInput,
  CreateTransferInput,
  CreateUnitOfMeasureInput,
  CreateWarehouseInput,
  CustomerResponse,
  EffectiveSettingResponse,
  FiscalPeriodResponse,
  InventoryBalanceResponse,
  InventoryMovementResponse,
  InventoryReservationResponse,
  InventoryTransferResponse,
  InviteMembershipInput,
  JournalEntryLineResponse,
  JournalEntryResponse,
  LeadResponse,
  ListAccountsFilter,
  ListActivitiesFilter,
  ListInventoryBalancesFilter,
  ListInventoryMovementsFilter,
  ListCommerceOrdersFilter,
  ListInventoryReservationsFilter,
  ListInventoryTransfersFilter,
  ListJournalEntriesFilter,
  ListLeadsFilter,
  ListOpportunitiesFilter,
  ListPaymentsFilter,
  ListPosRegistersFilter,
  ListPosReturnsFilter,
  ListPosSalesFilter,
  ListPosShiftsFilter,
  ListPurchaseOrdersFilter,
  ListPurchaseReceiptsFilter,
  ListPurchaseReturnsFilter,
  ListQuotesFilter,
  ListSalesOrdersFilter,
  ListSalesReturnsFilter,
  ListStorefrontProductsFilter,
  ListStorefrontsFilter,
  ListSupplierInvoicesFilter,
  LoginInput,
  MembershipResponse,
  MembershipWithUserResponse,
  MoveOpportunityStageInput,
  OpenShiftInput,
  OpportunityResponse,
  PaymentResponse,
  PendingInvitationResponse,
  PermissionResponse,
  PipelineResponse,
  PipelineStageResponse,
  PipelineSummaryResponse,
  PlatformSettingResponse,
  PlatformSettingValueResponse,
  PlatformUserResponse,
  PosCashMovementResponse,
  PosRegisterResponse,
  PosReturnResponse,
  PosSaleResponse,
  PosShiftResponse,
  PriceListItemResponse,
  PriceListResponse,
  ProductResponse,
  ProductVariantResponse,
  ProvisionTenantInput,
  ProvisionTenantResponse,
  PublicProductDetailResponse,
  PublicProductSummaryResponse,
  PublishProductInput,
  PurchaseOrderLineResponse,
  PurchaseOrderResponse,
  PurchaseReceiptLineResponse,
  PurchaseReceiptResponse,
  PurchaseReturnLineResponse,
  PurchaseReturnResponse,
  QuoteLineResponse,
  QuoteResponse,
  RecordCashMovementInput,
  RecordIssueInput,
  RecordReceiptInput,
  RegisterInput,
  ReverseJournalEntryInput,
  RingUpSaleInput,
  RoleAssignmentResponse,
  RoleResponse,
  SalesOrderLineResponse,
  SalesOrderResponse,
  SalesReturnLineResponse,
  SalesReturnResponse,
  SetAccountStatusInput,
  SetAppConfigurationInput,
  SetCustomerStatusInput,
  SetLeadConsentInput,
  SetLeadStatusInput,
  SetMasterDataStatusInput,
  SetPipelineStatusInput,
  SetPlatformSettingValueInput,
  SetPlatformUserStatusInput,
  SetPosRegisterStatusInput,
  SetPriceListStatusInput,
  SetProductStatusInput,
  SetProductVariantStatusInput,
  SetSettingValueInput,
  SetStorefrontStatusInput,
  SetSupplierStatusInput,
  SetTaxStatusInput,
  SetWarehouseStatusInput,
  SessionResponse,
  SettingDefinitionResponse,
  SettingValueResponse,
  StorefrontProductResponse,
  StorefrontResponse,
  SupplierInvoiceResponse,
  SupplierResponse,
  TaxResponse,
  TenantAppResponse,
  TenantExecutionContext,
  TenantSummary,
  TrialBalanceResponse,
  UnitOfMeasureResponse,
  UpdateAccountInput,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateCartLineQuantityInput,
  UpdateLeadInput,
  UpdateOpportunityInput,
  UpdatePriceListInput,
  UpdatePriceListItemInput,
  UpdateProductInput,
  UpdateProductVariantInput,
  UpdateSupplierInput,
  UpdateTaxInput,
  UpdateUnitOfMeasureInput,
  UpdateWarehouseInput,
  UserPreferenceResponse,
  WarehouseResponse,
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

  /** Company picker: discovers the companies in a tenant, so a client can resolve a companyId to send as X-Company-Id afterward. */
  async listCompanies(
    accessToken: string,
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<CompanyResponse[]> {
    return this.request<CompanyResponse[]>("/tenants/companies", { accessToken, tenantSlug, signal });
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

  async listTaxes(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<TaxResponse[]> {
    return this.request<TaxResponse[]>("/taxes", { accessToken, tenantSlug, companyId, signal });
  }

  async createTax(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateTaxInput,
  ): Promise<TaxResponse> {
    return this.request<TaxResponse>("/taxes", { method: "POST", accessToken, tenantSlug, companyId, body: input });
  }

  async updateTax(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateTaxInput,
  ): Promise<TaxResponse> {
    return this.request<TaxResponse>(`/taxes/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setTaxStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetTaxStatusInput,
  ): Promise<TaxResponse> {
    return this.request<TaxResponse>(`/taxes/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listWarehouses(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<WarehouseResponse[]> {
    return this.request<WarehouseResponse[]>("/warehouses", { accessToken, tenantSlug, companyId, signal });
  }

  async createWarehouse(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateWarehouseInput,
  ): Promise<WarehouseResponse> {
    return this.request<WarehouseResponse>("/warehouses", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateWarehouse(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdateWarehouseInput,
  ): Promise<WarehouseResponse> {
    return this.request<WarehouseResponse>(`/warehouses/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setWarehouseStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetWarehouseStatusInput,
  ): Promise<WarehouseResponse> {
    return this.request<WarehouseResponse>(`/warehouses/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPriceLists(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    signal?: AbortSignal,
  ): Promise<PriceListResponse[]> {
    return this.request<PriceListResponse[]>("/pricing/price-lists", { accessToken, tenantSlug, companyId, signal });
  }

  async createPriceList(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePriceListInput,
  ): Promise<PriceListResponse> {
    return this.request<PriceListResponse>("/pricing/price-lists", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updatePriceList(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: UpdatePriceListInput,
  ): Promise<PriceListResponse> {
    return this.request<PriceListResponse>(`/pricing/price-lists/${encodeURIComponent(id)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setPriceListStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
    input: SetPriceListStatusInput,
  ): Promise<PriceListResponse> {
    return this.request<PriceListResponse>(`/pricing/price-lists/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPriceListItems(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    priceListId: string,
    signal?: AbortSignal,
  ): Promise<PriceListItemResponse[]> {
    return this.request<PriceListItemResponse[]>(`/pricing/price-lists/${encodeURIComponent(priceListId)}/items`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addPriceListItem(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    priceListId: string,
    input: AddPriceListItemInput,
  ): Promise<PriceListItemResponse> {
    return this.request<PriceListItemResponse>(`/pricing/price-lists/${encodeURIComponent(priceListId)}/items`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updatePriceListItem(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    priceListId: string,
    itemId: string,
    input: UpdatePriceListItemInput,
  ): Promise<PriceListItemResponse> {
    return this.request<PriceListItemResponse>(
      `/pricing/price-lists/${encodeURIComponent(priceListId)}/items/${encodeURIComponent(itemId)}`,
      { method: "PUT", accessToken, tenantSlug, companyId, body: input },
    );
  }

  async removePriceListItem(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    priceListId: string,
    itemId: string,
  ): Promise<void> {
    await this.request<void>(
      `/pricing/price-lists/${encodeURIComponent(priceListId)}/items/${encodeURIComponent(itemId)}`,
      { method: "DELETE", accessToken, tenantSlug, companyId },
    );
  }

  async listInventoryBalances(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListInventoryBalancesFilter = {},
    signal?: AbortSignal,
  ): Promise<InventoryBalanceResponse[]> {
    return this.request<InventoryBalanceResponse[]>(`/inventory/balances${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listInventoryMovements(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListInventoryMovementsFilter = {},
    signal?: AbortSignal,
  ): Promise<InventoryMovementResponse[]> {
    return this.request<InventoryMovementResponse[]>(`/inventory/movements${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async recordInventoryReceipt(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: RecordReceiptInput,
  ): Promise<InventoryMovementResponse> {
    return this.request<InventoryMovementResponse>("/inventory/movements/receipt", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async recordInventoryIssue(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: RecordIssueInput,
  ): Promise<InventoryMovementResponse> {
    return this.request<InventoryMovementResponse>("/inventory/movements/issue", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async adjustInventory(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: AdjustInventoryInput,
  ): Promise<InventoryMovementResponse> {
    return this.request<InventoryMovementResponse>("/inventory/movements/adjustment", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listInventoryReservations(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListInventoryReservationsFilter = {},
    signal?: AbortSignal,
  ): Promise<InventoryReservationResponse[]> {
    return this.request<InventoryReservationResponse[]>(`/inventory/reservations${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createInventoryReservation(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateReservationInput,
  ): Promise<InventoryReservationResponse> {
    return this.request<InventoryReservationResponse>("/inventory/reservations", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async releaseInventoryReservation(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
  ): Promise<InventoryReservationResponse> {
    return this.request<InventoryReservationResponse>(`/inventory/reservations/${encodeURIComponent(id)}/release`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listInventoryTransfers(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListInventoryTransfersFilter = {},
    signal?: AbortSignal,
  ): Promise<InventoryTransferResponse[]> {
    return this.request<InventoryTransferResponse[]>(`/inventory/transfers${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createInventoryTransfer(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateTransferInput,
  ): Promise<InventoryTransferResponse> {
    return this.request<InventoryTransferResponse>("/inventory/transfers", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async completeInventoryTransfer(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
  ): Promise<InventoryTransferResponse> {
    return this.request<InventoryTransferResponse>(`/inventory/transfers/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async cancelInventoryTransfer(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    id: string,
  ): Promise<InventoryTransferResponse> {
    return this.request<InventoryTransferResponse>(`/inventory/transfers/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listQuotes(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListQuotesFilter = {},
    signal?: AbortSignal,
  ): Promise<QuoteResponse[]> {
    return this.request<QuoteResponse[]>(`/sales/quotes${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createQuote(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateQuoteInput,
  ): Promise<QuoteResponse> {
    return this.request<QuoteResponse>("/sales/quotes", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listQuoteLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    quoteId: string,
    signal?: AbortSignal,
  ): Promise<QuoteLineResponse[]> {
    return this.request<QuoteLineResponse[]>(`/sales/quotes/${encodeURIComponent(quoteId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addQuoteLine(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    quoteId: string,
    input: AddQuoteLineInput,
  ): Promise<QuoteLineResponse> {
    return this.request<QuoteLineResponse>(`/sales/quotes/${encodeURIComponent(quoteId)}/lines`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async convertQuoteToSalesOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    quoteId: string,
    input: ConvertQuoteInput = {},
  ): Promise<SalesOrderResponse> {
    return this.request<SalesOrderResponse>(`/sales/quotes/${encodeURIComponent(quoteId)}/convert`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async cancelQuote(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    quoteId: string,
  ): Promise<QuoteResponse> {
    return this.request<QuoteResponse>(`/sales/quotes/${encodeURIComponent(quoteId)}/cancel`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listSalesOrders(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListSalesOrdersFilter = {},
    signal?: AbortSignal,
  ): Promise<SalesOrderResponse[]> {
    return this.request<SalesOrderResponse[]>(`/sales/orders${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createSalesOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateSalesOrderInput,
  ): Promise<SalesOrderResponse> {
    return this.request<SalesOrderResponse>("/sales/orders", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listSalesOrderLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesOrderId: string,
    signal?: AbortSignal,
  ): Promise<SalesOrderLineResponse[]> {
    return this.request<SalesOrderLineResponse[]>(`/sales/orders/${encodeURIComponent(salesOrderId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addSalesOrderLine(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesOrderId: string,
    input: AddSalesOrderLineInput,
  ): Promise<SalesOrderLineResponse> {
    return this.request<SalesOrderLineResponse>(`/sales/orders/${encodeURIComponent(salesOrderId)}/lines`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async confirmSalesOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesOrderId: string,
  ): Promise<SalesOrderResponse> {
    return this.request<SalesOrderResponse>(`/sales/orders/${encodeURIComponent(salesOrderId)}/confirm`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async cancelSalesOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesOrderId: string,
  ): Promise<SalesOrderResponse> {
    return this.request<SalesOrderResponse>(`/sales/orders/${encodeURIComponent(salesOrderId)}/cancel`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async fulfillSalesOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesOrderId: string,
  ): Promise<SalesOrderResponse> {
    return this.request<SalesOrderResponse>(`/sales/orders/${encodeURIComponent(salesOrderId)}/fulfill`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listSalesReturns(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListSalesReturnsFilter = {},
    signal?: AbortSignal,
  ): Promise<SalesReturnResponse[]> {
    return this.request<SalesReturnResponse[]>(`/sales/returns${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createSalesReturn(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateSalesReturnInput,
  ): Promise<SalesReturnResponse> {
    return this.request<SalesReturnResponse>("/sales/returns", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listSalesReturnLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    salesReturnId: string,
    signal?: AbortSignal,
  ): Promise<SalesReturnLineResponse[]> {
    return this.request<SalesReturnLineResponse[]>(`/sales/returns/${encodeURIComponent(salesReturnId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listPayments(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPaymentsFilter = {},
    signal?: AbortSignal,
  ): Promise<PaymentResponse[]> {
    return this.request<PaymentResponse[]>(`/payments${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async capturePayment(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CapturePaymentInput,
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payments/capture", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async refundPayment(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    paymentId: string,
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listPurchaseOrders(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPurchaseOrdersFilter = {},
    signal?: AbortSignal,
  ): Promise<PurchaseOrderResponse[]> {
    return this.request<PurchaseOrderResponse[]>(`/purchasing/orders${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createPurchaseOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderResponse> {
    return this.request<PurchaseOrderResponse>("/purchasing/orders", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPurchaseOrderLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseOrderId: string,
    signal?: AbortSignal,
  ): Promise<PurchaseOrderLineResponse[]> {
    return this.request<PurchaseOrderLineResponse[]>(`/purchasing/orders/${encodeURIComponent(purchaseOrderId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addPurchaseOrderLine(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseOrderId: string,
    input: AddPurchaseOrderLineInput,
  ): Promise<PurchaseOrderLineResponse> {
    return this.request<PurchaseOrderLineResponse>(`/purchasing/orders/${encodeURIComponent(purchaseOrderId)}/lines`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async confirmPurchaseOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderResponse> {
    return this.request<PurchaseOrderResponse>(`/purchasing/orders/${encodeURIComponent(purchaseOrderId)}/confirm`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async closePurchaseOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderResponse> {
    return this.request<PurchaseOrderResponse>(`/purchasing/orders/${encodeURIComponent(purchaseOrderId)}/close`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async cancelPurchaseOrder(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderResponse> {
    return this.request<PurchaseOrderResponse>(`/purchasing/orders/${encodeURIComponent(purchaseOrderId)}/cancel`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listPurchaseReceipts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPurchaseReceiptsFilter = {},
    signal?: AbortSignal,
  ): Promise<PurchaseReceiptResponse[]> {
    return this.request<PurchaseReceiptResponse[]>(`/purchasing/receipts${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createPurchaseReceipt(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePurchaseReceiptInput,
  ): Promise<PurchaseReceiptResponse> {
    return this.request<PurchaseReceiptResponse>("/purchasing/receipts", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPurchaseReceiptLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseReceiptId: string,
    signal?: AbortSignal,
  ): Promise<PurchaseReceiptLineResponse[]> {
    return this.request<PurchaseReceiptLineResponse[]>(`/purchasing/receipts/${encodeURIComponent(purchaseReceiptId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listPurchaseReturns(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPurchaseReturnsFilter = {},
    signal?: AbortSignal,
  ): Promise<PurchaseReturnResponse[]> {
    return this.request<PurchaseReturnResponse[]>(`/purchasing/returns${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createPurchaseReturn(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePurchaseReturnInput,
  ): Promise<PurchaseReturnResponse> {
    return this.request<PurchaseReturnResponse>("/purchasing/returns", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPurchaseReturnLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    purchaseReturnId: string,
    signal?: AbortSignal,
  ): Promise<PurchaseReturnLineResponse[]> {
    return this.request<PurchaseReturnLineResponse[]>(`/purchasing/returns/${encodeURIComponent(purchaseReturnId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listSupplierInvoices(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListSupplierInvoicesFilter = {},
    signal?: AbortSignal,
  ): Promise<SupplierInvoiceResponse[]> {
    return this.request<SupplierInvoiceResponse[]>(`/purchasing/supplier-invoices${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createSupplierInvoice(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateSupplierInvoiceInput,
  ): Promise<SupplierInvoiceResponse> {
    return this.request<SupplierInvoiceResponse>("/purchasing/supplier-invoices", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async cancelSupplierInvoice(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    supplierInvoiceId: string,
  ): Promise<SupplierInvoiceResponse> {
    return this.request<SupplierInvoiceResponse>(`/purchasing/supplier-invoices/${encodeURIComponent(supplierInvoiceId)}/cancel`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listPosRegisters(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPosRegistersFilter = {},
    signal?: AbortSignal,
  ): Promise<PosRegisterResponse[]> {
    return this.request<PosRegisterResponse[]>(`/pos/registers${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createPosRegister(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePosRegisterInput,
  ): Promise<PosRegisterResponse> {
    return this.request<PosRegisterResponse>("/pos/registers", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setPosRegisterStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    registerId: string,
    input: SetPosRegisterStatusInput,
  ): Promise<PosRegisterResponse> {
    return this.request<PosRegisterResponse>(`/pos/registers/${encodeURIComponent(registerId)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPosShifts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPosShiftsFilter = {},
    signal?: AbortSignal,
  ): Promise<PosShiftResponse[]> {
    return this.request<PosShiftResponse[]>(`/pos/shifts${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async getPosShift(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    shiftId: string,
    signal?: AbortSignal,
  ): Promise<PosShiftResponse> {
    return this.request<PosShiftResponse>(`/pos/shifts/${encodeURIComponent(shiftId)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async openShift(accessToken: string, tenantSlug: string, companyId: string, input: OpenShiftInput): Promise<PosShiftResponse> {
    return this.request<PosShiftResponse>("/pos/shifts", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async closeShift(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    shiftId: string,
    input: CloseShiftInput,
  ): Promise<PosShiftResponse> {
    return this.request<PosShiftResponse>(`/pos/shifts/${encodeURIComponent(shiftId)}/close`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listCashMovements(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    shiftId: string,
    signal?: AbortSignal,
  ): Promise<PosCashMovementResponse[]> {
    return this.request<PosCashMovementResponse[]>(`/pos/shifts/${encodeURIComponent(shiftId)}/cash-movements`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async recordCashMovement(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    shiftId: string,
    input: RecordCashMovementInput,
  ): Promise<PosCashMovementResponse> {
    return this.request<PosCashMovementResponse>(`/pos/shifts/${encodeURIComponent(shiftId)}/cash-movements`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPosSales(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPosSalesFilter = {},
    signal?: AbortSignal,
  ): Promise<PosSaleResponse[]> {
    return this.request<PosSaleResponse[]>(`/pos/sales${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async getPosSale(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    posSaleId: string,
    signal?: AbortSignal,
  ): Promise<PosSaleResponse> {
    return this.request<PosSaleResponse>(`/pos/sales/${encodeURIComponent(posSaleId)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async ringUpSale(accessToken: string, tenantSlug: string, companyId: string, input: RingUpSaleInput): Promise<PosSaleResponse> {
    return this.request<PosSaleResponse>("/pos/sales", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPosReturns(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListPosReturnsFilter = {},
    signal?: AbortSignal,
  ): Promise<PosReturnResponse[]> {
    return this.request<PosReturnResponse[]>(`/pos/returns${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createPosReturn(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreatePosReturnInput,
  ): Promise<PosReturnResponse> {
    return this.request<PosReturnResponse>("/pos/returns", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  // --- Commerce: admin (authenticated) side ---

  async listStorefronts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListStorefrontsFilter = {},
    signal?: AbortSignal,
  ): Promise<StorefrontResponse[]> {
    return this.request<StorefrontResponse[]>(`/commerce/storefronts${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createStorefront(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateStorefrontInput,
  ): Promise<StorefrontResponse> {
    return this.request<StorefrontResponse>("/commerce/storefronts", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setStorefrontStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    storefrontId: string,
    input: SetStorefrontStatusInput,
  ): Promise<StorefrontResponse> {
    return this.request<StorefrontResponse>(`/commerce/storefronts/${encodeURIComponent(storefrontId)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listStorefrontProducts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    storefrontId: string,
    filter: ListStorefrontProductsFilter = {},
    signal?: AbortSignal,
  ): Promise<StorefrontProductResponse[]> {
    return this.request<StorefrontProductResponse[]>(`/commerce/storefronts/${encodeURIComponent(storefrontId)}/products${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async publishProduct(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    storefrontId: string,
    input: PublishProductInput,
  ): Promise<StorefrontProductResponse> {
    return this.request<StorefrontProductResponse>(`/commerce/storefronts/${encodeURIComponent(storefrontId)}/products`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async unpublishProduct(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    storefrontId: string,
    productId: string,
  ): Promise<StorefrontProductResponse> {
    return this.request<StorefrontProductResponse>(
      `/commerce/storefronts/${encodeURIComponent(storefrontId)}/products/${encodeURIComponent(productId)}`,
      { method: "DELETE", accessToken, tenantSlug, companyId },
    );
  }

  async listCommerceOrders(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListCommerceOrdersFilter = {},
    signal?: AbortSignal,
  ): Promise<CommerceOrderResponse[]> {
    return this.request<CommerceOrderResponse[]>(`/commerce/orders${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  // --- Commerce: public storefront side (no accessToken/tenantSlug — see docs/DECISIONS.md ADR-011) ---

  async listPublicProducts(storefrontCode: string, limit?: number, signal?: AbortSignal): Promise<PublicProductSummaryResponse[]> {
    return this.request<PublicProductSummaryResponse[]>(
      `/storefront/${encodeURIComponent(storefrontCode)}/products${this.buildQuery({ limit })}`,
      { signal },
    );
  }

  async getPublicProduct(storefrontCode: string, productId: string, signal?: AbortSignal): Promise<PublicProductDetailResponse> {
    return this.request<PublicProductDetailResponse>(
      `/storefront/${encodeURIComponent(storefrontCode)}/products/${encodeURIComponent(productId)}`,
      { signal },
    );
  }

  async createCart(storefrontCode: string, cartId?: string): Promise<CartResponse> {
    return this.request<CartResponse>(`/storefront/${encodeURIComponent(storefrontCode)}/carts`, {
      method: "POST",
      body: { cartId },
    });
  }

  async getCart(storefrontCode: string, cartId: string, signal?: AbortSignal): Promise<CartResponse> {
    return this.request<CartResponse>(`/storefront/${encodeURIComponent(storefrontCode)}/carts/${encodeURIComponent(cartId)}`, { signal });
  }

  async addCartLine(storefrontCode: string, cartId: string, input: AddCartLineInput): Promise<CartResponse> {
    return this.request<CartResponse>(`/storefront/${encodeURIComponent(storefrontCode)}/carts/${encodeURIComponent(cartId)}/lines`, {
      method: "POST",
      body: input,
    });
  }

  async updateCartLineQuantity(
    storefrontCode: string,
    cartId: string,
    lineId: string,
    input: UpdateCartLineQuantityInput,
  ): Promise<CartResponse> {
    return this.request<CartResponse>(
      `/storefront/${encodeURIComponent(storefrontCode)}/carts/${encodeURIComponent(cartId)}/lines/${encodeURIComponent(lineId)}`,
      { method: "PUT", body: input },
    );
  }

  async removeCartLine(storefrontCode: string, cartId: string, lineId: string): Promise<CartResponse> {
    return this.request<CartResponse>(
      `/storefront/${encodeURIComponent(storefrontCode)}/carts/${encodeURIComponent(cartId)}/lines/${encodeURIComponent(lineId)}`,
      { method: "DELETE" },
    );
  }

  async checkout(storefrontCode: string, cartId: string, input: CheckoutInput): Promise<CommerceOrderResponse> {
    return this.request<CommerceOrderResponse>(`/storefront/${encodeURIComponent(storefrontCode)}/checkout`, {
      method: "POST",
      body: { cartId, ...input },
    });
  }

  async getPublicOrder(storefrontCode: string, orderId: string, signal?: AbortSignal): Promise<CommerceOrderResponse> {
    return this.request<CommerceOrderResponse>(
      `/storefront/${encodeURIComponent(storefrontCode)}/orders/${encodeURIComponent(orderId)}`,
      { signal },
    );
  }

  // --- Accounting ---

  async listAccounts(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListAccountsFilter = {},
    signal?: AbortSignal,
  ): Promise<AccountResponse[]> {
    return this.request<AccountResponse[]>(`/accounting/accounts${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createAccount(accessToken: string, tenantSlug: string, companyId: string, input: CreateAccountInput): Promise<AccountResponse> {
    return this.request<AccountResponse>("/accounting/accounts", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async updateAccount(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountResponse> {
    return this.request<AccountResponse>(`/accounting/accounts/${encodeURIComponent(accountId)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setAccountStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    accountId: string,
    input: SetAccountStatusInput,
  ): Promise<AccountResponse> {
    return this.request<AccountResponse>(`/accounting/accounts/${encodeURIComponent(accountId)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listFiscalPeriods(accessToken: string, tenantSlug: string, companyId: string, signal?: AbortSignal): Promise<FiscalPeriodResponse[]> {
    return this.request<FiscalPeriodResponse[]>("/accounting/fiscal-periods", { accessToken, tenantSlug, companyId, signal });
  }

  async createFiscalPeriod(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateFiscalPeriodInput,
  ): Promise<FiscalPeriodResponse> {
    return this.request<FiscalPeriodResponse>("/accounting/fiscal-periods", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async closeFiscalPeriod(accessToken: string, tenantSlug: string, companyId: string, periodId: string): Promise<FiscalPeriodResponse> {
    return this.request<FiscalPeriodResponse>(`/accounting/fiscal-periods/${encodeURIComponent(periodId)}/close`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listJournalEntries(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListJournalEntriesFilter = {},
    signal?: AbortSignal,
  ): Promise<JournalEntryResponse[]> {
    return this.request<JournalEntryResponse[]>(`/accounting/journal-entries${this.buildQuery(filter)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async getJournalEntry(accessToken: string, tenantSlug: string, companyId: string, entryId: string, signal?: AbortSignal): Promise<JournalEntryResponse> {
    return this.request<JournalEntryResponse>(`/accounting/journal-entries/${encodeURIComponent(entryId)}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listJournalEntryLines(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    entryId: string,
    signal?: AbortSignal,
  ): Promise<JournalEntryLineResponse[]> {
    return this.request<JournalEntryLineResponse[]>(`/accounting/journal-entries/${encodeURIComponent(entryId)}/lines`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async createJournalEntry(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateJournalEntryInput,
  ): Promise<JournalEntryResponse> {
    return this.request<JournalEntryResponse>("/accounting/journal-entries", {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async reverseJournalEntry(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    entryId: string,
    input: ReverseJournalEntryInput = {},
  ): Promise<JournalEntryResponse> {
    return this.request<JournalEntryResponse>(`/accounting/journal-entries/${encodeURIComponent(entryId)}/reverse`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async getTrialBalance(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    asOfDate?: string,
    signal?: AbortSignal,
  ): Promise<TrialBalanceResponse> {
    return this.request<TrialBalanceResponse>(`/accounting/reports/trial-balance${this.buildQuery({ asOfDate })}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async getAccountLedger(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    accountId: string,
    asOfDate?: string,
    signal?: AbortSignal,
  ): Promise<AccountLedgerResponse> {
    return this.request<AccountLedgerResponse>(`/accounting/reports/account-ledger${this.buildQuery({ accountId, asOfDate })}`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  // --- CRM ---

  async listLeads(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListLeadsFilter = {},
    signal?: AbortSignal,
  ): Promise<LeadResponse[]> {
    return this.request<LeadResponse[]>(`/crm/leads${this.buildQuery(filter)}`, { accessToken, tenantSlug, companyId, signal });
  }

  async getLead(accessToken: string, tenantSlug: string, companyId: string, leadId: string, signal?: AbortSignal): Promise<LeadResponse> {
    return this.request<LeadResponse>(`/crm/leads/${encodeURIComponent(leadId)}`, { accessToken, tenantSlug, companyId, signal });
  }

  async createLead(accessToken: string, tenantSlug: string, companyId: string, input: CreateLeadInput): Promise<LeadResponse> {
    return this.request<LeadResponse>("/crm/leads", { method: "POST", accessToken, tenantSlug, companyId, body: input });
  }

  async updateLead(accessToken: string, tenantSlug: string, companyId: string, leadId: string, input: UpdateLeadInput): Promise<LeadResponse> {
    return this.request<LeadResponse>(`/crm/leads/${encodeURIComponent(leadId)}`, { method: "PUT", accessToken, tenantSlug, companyId, body: input });
  }

  async setLeadStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    leadId: string,
    input: SetLeadStatusInput,
  ): Promise<LeadResponse> {
    return this.request<LeadResponse>(`/crm/leads/${encodeURIComponent(leadId)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async setLeadConsent(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    leadId: string,
    input: SetLeadConsentInput,
  ): Promise<LeadResponse> {
    return this.request<LeadResponse>(`/crm/leads/${encodeURIComponent(leadId)}/consent`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async convertLead(accessToken: string, tenantSlug: string, companyId: string, leadId: string): Promise<ConvertLeadResponse> {
    return this.request<ConvertLeadResponse>(`/crm/leads/${encodeURIComponent(leadId)}/convert`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  async listPipelines(accessToken: string, tenantSlug: string, companyId: string, signal?: AbortSignal): Promise<PipelineResponse[]> {
    return this.request<PipelineResponse[]>("/crm/pipelines", { accessToken, tenantSlug, companyId, signal });
  }

  async createPipeline(accessToken: string, tenantSlug: string, companyId: string, input: CreatePipelineInput): Promise<PipelineResponse> {
    return this.request<PipelineResponse>("/crm/pipelines", { method: "POST", accessToken, tenantSlug, companyId, body: input });
  }

  async setPipelineStatus(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    pipelineId: string,
    input: SetPipelineStatusInput,
  ): Promise<PipelineResponse> {
    return this.request<PipelineResponse>(`/crm/pipelines/${encodeURIComponent(pipelineId)}/status`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listPipelineStages(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    pipelineId: string,
    signal?: AbortSignal,
  ): Promise<PipelineStageResponse[]> {
    return this.request<PipelineStageResponse[]>(`/crm/pipelines/${encodeURIComponent(pipelineId)}/stages`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async addPipelineStage(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    pipelineId: string,
    input: AddPipelineStageInput,
  ): Promise<PipelineStageResponse> {
    return this.request<PipelineStageResponse>(`/crm/pipelines/${encodeURIComponent(pipelineId)}/stages`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async getPipelineSummary(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    pipelineId: string,
    signal?: AbortSignal,
  ): Promise<PipelineSummaryResponse> {
    return this.request<PipelineSummaryResponse>(`/crm/pipelines/${encodeURIComponent(pipelineId)}/summary`, {
      accessToken,
      tenantSlug,
      companyId,
      signal,
    });
  }

  async listOpportunities(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListOpportunitiesFilter = {},
    signal?: AbortSignal,
  ): Promise<OpportunityResponse[]> {
    return this.request<OpportunityResponse[]>(`/crm/opportunities${this.buildQuery(filter)}`, { accessToken, tenantSlug, companyId, signal });
  }

  async getOpportunity(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    opportunityId: string,
    signal?: AbortSignal,
  ): Promise<OpportunityResponse> {
    return this.request<OpportunityResponse>(`/crm/opportunities/${encodeURIComponent(opportunityId)}`, { accessToken, tenantSlug, companyId, signal });
  }

  async createOpportunity(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    input: CreateOpportunityInput,
  ): Promise<OpportunityResponse> {
    return this.request<OpportunityResponse>("/crm/opportunities", { method: "POST", accessToken, tenantSlug, companyId, body: input });
  }

  async updateOpportunity(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    opportunityId: string,
    input: UpdateOpportunityInput,
  ): Promise<OpportunityResponse> {
    return this.request<OpportunityResponse>(`/crm/opportunities/${encodeURIComponent(opportunityId)}`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async moveOpportunityStage(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    opportunityId: string,
    input: MoveOpportunityStageInput,
  ): Promise<OpportunityResponse> {
    return this.request<OpportunityResponse>(`/crm/opportunities/${encodeURIComponent(opportunityId)}/stage`, {
      method: "PUT",
      accessToken,
      tenantSlug,
      companyId,
      body: input,
    });
  }

  async listActivities(
    accessToken: string,
    tenantSlug: string,
    companyId: string,
    filter: ListActivitiesFilter = {},
    signal?: AbortSignal,
  ): Promise<ActivityResponse[]> {
    return this.request<ActivityResponse[]>(`/crm/activities${this.buildQuery(filter)}`, { accessToken, tenantSlug, companyId, signal });
  }

  async createActivity(accessToken: string, tenantSlug: string, companyId: string, input: CreateActivityInput): Promise<ActivityResponse> {
    return this.request<ActivityResponse>("/crm/activities", { method: "POST", accessToken, tenantSlug, companyId, body: input });
  }

  async completeActivity(accessToken: string, tenantSlug: string, companyId: string, activityId: string): Promise<ActivityResponse> {
    return this.request<ActivityResponse>(`/crm/activities/${encodeURIComponent(activityId)}/complete`, {
      method: "POST",
      accessToken,
      tenantSlug,
      companyId,
    });
  }

  /** Builds a `?key=value&...` query string from a flat filter object, skipping undefined/empty values. */
  private buildQuery(filter: object): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return query ? `?${query}` : "";
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
