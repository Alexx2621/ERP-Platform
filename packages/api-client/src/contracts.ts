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

export type AppKind = components["schemas"]["AppDefinitionResponseDto"]["kind"];
export type TenantAppStatus = components["schemas"]["TenantAppResponseDto"]["status"];
export type AppDefinitionResponse = components["schemas"]["AppDefinitionResponseDto"];
export type TenantAppResponse = components["schemas"]["TenantAppResponseDto"];

export type AppConfigurationResponse = Omit<components["schemas"]["AppConfigurationResponseDto"], "value"> & {
  value: unknown;
};

export type SetAppConfigurationInput = Omit<components["schemas"]["SetAppConfigurationDto"], "value"> & {
  value: unknown;
};

export type MasterDataStatus = components["schemas"]["UnitOfMeasureResponseDto"]["status"];
export type UnitOfMeasureResponse = components["schemas"]["UnitOfMeasureResponseDto"];
export type CreateUnitOfMeasureInput = components["schemas"]["CreateUnitOfMeasureDto"];
export type UpdateUnitOfMeasureInput = components["schemas"]["UpdateUnitOfMeasureDto"];
export type SetMasterDataStatusInput = components["schemas"]["SetUnitOfMeasureStatusDto"];

export type CategoryResponse = components["schemas"]["CategoryResponseDto"];
export type CreateCategoryInput = components["schemas"]["CreateCategoryDto"];
export type UpdateCategoryInput = components["schemas"]["UpdateCategoryDto"];

export type BrandResponse = components["schemas"]["BrandResponseDto"];
export type CreateBrandInput = components["schemas"]["CreateBrandDto"];
export type UpdateBrandInput = components["schemas"]["UpdateBrandDto"];

export type ProductType = components["schemas"]["ProductResponseDto"]["type"];
export type ProductStatus = components["schemas"]["ProductResponseDto"]["status"];
export type ProductResponse = components["schemas"]["ProductResponseDto"];
export type SetProductStatusInput = components["schemas"]["SetProductStatusDto"];
export type SetProductVariantStatusInput = components["schemas"]["SetProductVariantStatusDto"];

/**
 * `trackInventory`/`sellable`/`purchasable`/`hasVariants`/`publishOnline`
 * are genuinely optional on the wire (each has a server-side default —
 * confirmed against the raw OpenAPI spec's own `required` array) but
 * `openapi-typescript` renders a boolean property with a JSON-Schema
 * `default` as non-optional in the generated TS type. Restoring them to
 * optional here matches the real API contract instead of forcing every
 * caller to pass all five.
 */
export type CreateProductInput = Omit<
  components["schemas"]["CreateProductDto"],
  "trackInventory" | "sellable" | "purchasable" | "hasVariants" | "publishOnline"
> &
  Partial<
    Pick<
      components["schemas"]["CreateProductDto"],
      "trackInventory" | "sellable" | "purchasable" | "hasVariants" | "publishOnline"
    >
  >;
export type UpdateProductInput = components["schemas"]["UpdateProductDto"];

export type AddProductVariantInput = Omit<components["schemas"]["AddProductVariantDto"], "attributes"> & {
  attributes: Record<string, string>;
};
export type UpdateProductVariantInput = components["schemas"]["UpdateProductVariantDto"];
export type ProductVariantResponse = Omit<components["schemas"]["ProductVariantResponseDto"], "attributes"> & {
  attributes: Record<string, string>;
};

export type CustomerResponse = components["schemas"]["CustomerResponseDto"];
export type CreateCustomerInput = components["schemas"]["CreateCustomerDto"];
export type UpdateCustomerInput = components["schemas"]["UpdateCustomerDto"];
export type SetCustomerStatusInput = components["schemas"]["SetCustomerStatusDto"];

export type SupplierResponse = components["schemas"]["SupplierResponseDto"];
export type CreateSupplierInput = components["schemas"]["CreateSupplierDto"];
export type UpdateSupplierInput = components["schemas"]["UpdateSupplierDto"];
export type SetSupplierStatusInput = components["schemas"]["SetSupplierStatusDto"];

export type TaxResponse = components["schemas"]["TaxResponseDto"];
export type CreateTaxInput = components["schemas"]["CreateTaxDto"];
export type UpdateTaxInput = components["schemas"]["UpdateTaxDto"];
export type SetTaxStatusInput = components["schemas"]["SetTaxStatusDto"];

export type WarehouseResponse = components["schemas"]["WarehouseResponseDto"];
export type CreateWarehouseInput = components["schemas"]["CreateWarehouseDto"];
export type UpdateWarehouseInput = components["schemas"]["UpdateWarehouseDto"];
export type SetWarehouseStatusInput = components["schemas"]["SetWarehouseStatusDto"];

export type PriceListResponse = components["schemas"]["PriceListResponseDto"];
export type CreatePriceListInput = components["schemas"]["CreatePriceListDto"];
export type UpdatePriceListInput = components["schemas"]["UpdatePriceListDto"];
export type SetPriceListStatusInput = components["schemas"]["SetPriceListStatusDto"];
export type PriceListItemResponse = components["schemas"]["PriceListItemResponseDto"];
export type AddPriceListItemInput = components["schemas"]["AddPriceListItemDto"];
export type UpdatePriceListItemInput = components["schemas"]["UpdatePriceListItemDto"];

export interface ApiErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}
