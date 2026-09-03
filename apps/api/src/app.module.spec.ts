import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { PrismaService } from "./shared/prisma/prisma.service";
import { RedisService } from "./shared/redis/redis.service";
import { AuthController } from "./core/auth/presentation/auth.controller";
import {
  ListMyTenantsUseCase,
  ProvisionTenantUseCase,
  ResolveTenantContextUseCase,
  TenantContextGuard,
  RolesController,
  AuditEntriesController,
  NotificationsController,
  AppsController,
} from "./core/tenants";
import { RecordAuditEntryUseCase, ListAuditEntriesUseCase } from "./core/audit";
import { TenantsController } from "./core/tenants/presentation/tenants.controller";
import { CreateOrganizationUseCase } from "./core/organizations";
import { CreateCompanyUseCase, ListCompaniesUseCase } from "./core/companies";
import {
  CreateRoleUseCase,
  AssignRoleUseCase,
  HasPermissionUseCase,
  PermissionGuard,
} from "./core/access-control";
import { GetEffectiveSettingUseCase, SetSettingValueUseCase } from "./core/configuration";
import { SettingsController } from "./core/configuration/presentation/settings.controller";
import { PreferencesController } from "./core/configuration/presentation/preferences.controller";
import {
  UploadFileUseCase,
  GetFileDownloadUrlUseCase,
  ListFilesUseCase,
  DeleteFileUseCase,
  FilesController,
} from "./core/files";
import {
  RequestNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from "./core/notifications";
import {
  PlatformAdminGuard,
  PlatformUsersController,
  PlatformSettingsController,
  PlatformAuditEntriesController,
} from "./core/platform-admin";
import { ListUsersUseCase } from "./core/users";
import { ListPlatformSettingsUseCase } from "./core/configuration";
import { ListPlatformAuditEntriesUseCase } from "./core/audit";
import { EnableAppUseCase, DisableAppUseCase, ListTenantAppsUseCase } from "./core/app-registry";
import {
  UnitsOfMeasureController,
  CategoriesController,
  BrandsController,
  ProductsController,
  CreateProductUseCase,
  AddProductVariantUseCase,
} from "./modules/catalog";
import { CustomersController, CreateCustomerUseCase } from "./modules/customers";
import { SuppliersController, CreateSupplierUseCase } from "./modules/suppliers";
import { TaxesController, CreateTaxUseCase } from "./modules/taxes";
import { WarehousesController, CreateWarehouseUseCase } from "./modules/warehouses";
import { PriceListsController, CreatePriceListUseCase } from "./modules/pricing";
import { InventoryController, ListInventoryBalancesUseCase, ListInventoryMovementsUseCase } from "./modules/inventory";
import {
  QuotesController,
  SalesOrdersController,
  SalesReturnsController,
  ConfirmSalesOrderUseCase,
  GetSalesOrderUseCase,
} from "./modules/sales";
import { PaymentsController, CapturePaymentUseCase, RefundPaymentUseCase } from "./modules/payments";
import {
  PurchaseOrdersController,
  PurchaseReceiptsController,
  PurchaseReturnsController,
  SupplierInvoicesController,
  ConfirmPurchaseOrderUseCase,
  GetPurchaseOrderUseCase,
} from "./modules/purchasing";
import { PosRegistersController, PosShiftsController, PosSalesController, PosReturnsController } from "./modules/pos";
import { StorefrontsController, StorefrontPublicController, ListPublishedProductsUseCase } from "./modules/commerce";
import { AccountsController, FiscalPeriodsController, JournalEntriesController, AccountingReportsController, CreateJournalEntryUseCase } from "./modules/accounting";
import { LeadsController, PipelinesController, OpportunitiesController, ActivitiesController, CreateActivityUseCase } from "./modules/crm";
import { BillsOfMaterialController, ProductionOrdersController, GetProductionOrderUseCase } from "./modules/manufacturing";

/**
 * Boots the real AppModule graph (Auth + Users + Tenants + Organizations +
 * Companies) with only PrismaService stubbed out, so a broken import, a
 * missing provider, or a circular dependency between core modules fails here
 * instead of only being discoverable at real server startup. This is the
 * check that would have caught TenantsModule never being wired into
 * AppModule (docs/PROJECT_STATE.md — fixed 2026-08-26).
 */
describe("AppModule wiring", () => {
  it("compiles the full module graph with every cross-module use case resolvable", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(TenantsController)).toBeInstanceOf(TenantsController);
    expect(moduleRef.get(ProvisionTenantUseCase)).toBeInstanceOf(ProvisionTenantUseCase);
    expect(moduleRef.get(ResolveTenantContextUseCase)).toBeInstanceOf(ResolveTenantContextUseCase);
    expect(moduleRef.get(ListMyTenantsUseCase)).toBeInstanceOf(ListMyTenantsUseCase);
    expect(moduleRef.get(TenantContextGuard)).toBeInstanceOf(TenantContextGuard);
    expect(moduleRef.get(CreateOrganizationUseCase)).toBeInstanceOf(CreateOrganizationUseCase);
    expect(moduleRef.get(CreateCompanyUseCase)).toBeInstanceOf(CreateCompanyUseCase);
    expect(moduleRef.get(ListCompaniesUseCase)).toBeInstanceOf(ListCompaniesUseCase);
    expect(moduleRef.get(RolesController)).toBeInstanceOf(RolesController);
    expect(moduleRef.get(CreateRoleUseCase)).toBeInstanceOf(CreateRoleUseCase);
    expect(moduleRef.get(AssignRoleUseCase)).toBeInstanceOf(AssignRoleUseCase);
    expect(moduleRef.get(HasPermissionUseCase)).toBeInstanceOf(HasPermissionUseCase);
    expect(moduleRef.get(PermissionGuard)).toBeInstanceOf(PermissionGuard);
    expect(moduleRef.get(GetEffectiveSettingUseCase)).toBeInstanceOf(GetEffectiveSettingUseCase);
    expect(moduleRef.get(SetSettingValueUseCase)).toBeInstanceOf(SetSettingValueUseCase);
    expect(moduleRef.get(SettingsController)).toBeInstanceOf(SettingsController);
    expect(moduleRef.get(PreferencesController)).toBeInstanceOf(PreferencesController);
    expect(moduleRef.get(RecordAuditEntryUseCase)).toBeInstanceOf(RecordAuditEntryUseCase);
    expect(moduleRef.get(ListAuditEntriesUseCase)).toBeInstanceOf(ListAuditEntriesUseCase);
    expect(moduleRef.get(AuditEntriesController)).toBeInstanceOf(AuditEntriesController);
    expect(moduleRef.get(UploadFileUseCase)).toBeInstanceOf(UploadFileUseCase);
    expect(moduleRef.get(GetFileDownloadUrlUseCase)).toBeInstanceOf(GetFileDownloadUrlUseCase);
    expect(moduleRef.get(ListFilesUseCase)).toBeInstanceOf(ListFilesUseCase);
    expect(moduleRef.get(DeleteFileUseCase)).toBeInstanceOf(DeleteFileUseCase);
    expect(moduleRef.get(FilesController)).toBeInstanceOf(FilesController);
    expect(moduleRef.get(RequestNotificationUseCase)).toBeInstanceOf(RequestNotificationUseCase);
    expect(moduleRef.get(ListNotificationsUseCase)).toBeInstanceOf(ListNotificationsUseCase);
    expect(moduleRef.get(MarkNotificationReadUseCase)).toBeInstanceOf(MarkNotificationReadUseCase);
    expect(moduleRef.get(NotificationsController)).toBeInstanceOf(NotificationsController);
    expect(moduleRef.get(PlatformAdminGuard)).toBeInstanceOf(PlatformAdminGuard);
    expect(moduleRef.get(PlatformUsersController)).toBeInstanceOf(PlatformUsersController);
    expect(moduleRef.get(ListUsersUseCase)).toBeInstanceOf(ListUsersUseCase);
    expect(moduleRef.get(PlatformSettingsController)).toBeInstanceOf(PlatformSettingsController);
    expect(moduleRef.get(ListPlatformSettingsUseCase)).toBeInstanceOf(ListPlatformSettingsUseCase);
    expect(moduleRef.get(PlatformAuditEntriesController)).toBeInstanceOf(PlatformAuditEntriesController);
    expect(moduleRef.get(ListPlatformAuditEntriesUseCase)).toBeInstanceOf(ListPlatformAuditEntriesUseCase);
    expect(moduleRef.get(AppsController)).toBeInstanceOf(AppsController);
    expect(moduleRef.get(EnableAppUseCase)).toBeInstanceOf(EnableAppUseCase);
    expect(moduleRef.get(DisableAppUseCase)).toBeInstanceOf(DisableAppUseCase);
    expect(moduleRef.get(ListTenantAppsUseCase)).toBeInstanceOf(ListTenantAppsUseCase);
    expect(moduleRef.get(UnitsOfMeasureController)).toBeInstanceOf(UnitsOfMeasureController);
    expect(moduleRef.get(CategoriesController)).toBeInstanceOf(CategoriesController);
    expect(moduleRef.get(BrandsController)).toBeInstanceOf(BrandsController);
    expect(moduleRef.get(ProductsController)).toBeInstanceOf(ProductsController);
    expect(moduleRef.get(CreateProductUseCase)).toBeInstanceOf(CreateProductUseCase);
    expect(moduleRef.get(AddProductVariantUseCase)).toBeInstanceOf(AddProductVariantUseCase);
    expect(moduleRef.get(CustomersController)).toBeInstanceOf(CustomersController);
    expect(moduleRef.get(CreateCustomerUseCase)).toBeInstanceOf(CreateCustomerUseCase);
    expect(moduleRef.get(SuppliersController)).toBeInstanceOf(SuppliersController);
    expect(moduleRef.get(CreateSupplierUseCase)).toBeInstanceOf(CreateSupplierUseCase);
    expect(moduleRef.get(TaxesController)).toBeInstanceOf(TaxesController);
    expect(moduleRef.get(CreateTaxUseCase)).toBeInstanceOf(CreateTaxUseCase);
    expect(moduleRef.get(WarehousesController)).toBeInstanceOf(WarehousesController);
    expect(moduleRef.get(CreateWarehouseUseCase)).toBeInstanceOf(CreateWarehouseUseCase);
    expect(moduleRef.get(PriceListsController)).toBeInstanceOf(PriceListsController);
    expect(moduleRef.get(CreatePriceListUseCase)).toBeInstanceOf(CreatePriceListUseCase);
    expect(moduleRef.get(InventoryController)).toBeInstanceOf(InventoryController);
    expect(moduleRef.get(ListInventoryBalancesUseCase)).toBeInstanceOf(ListInventoryBalancesUseCase);
    expect(moduleRef.get(ListInventoryMovementsUseCase)).toBeInstanceOf(ListInventoryMovementsUseCase);
    expect(moduleRef.get(QuotesController)).toBeInstanceOf(QuotesController);
    expect(moduleRef.get(SalesOrdersController)).toBeInstanceOf(SalesOrdersController);
    expect(moduleRef.get(SalesReturnsController)).toBeInstanceOf(SalesReturnsController);
    expect(moduleRef.get(ConfirmSalesOrderUseCase)).toBeInstanceOf(ConfirmSalesOrderUseCase);
    expect(moduleRef.get(GetSalesOrderUseCase)).toBeInstanceOf(GetSalesOrderUseCase);
    expect(moduleRef.get(PaymentsController)).toBeInstanceOf(PaymentsController);
    expect(moduleRef.get(CapturePaymentUseCase)).toBeInstanceOf(CapturePaymentUseCase);
    expect(moduleRef.get(RefundPaymentUseCase)).toBeInstanceOf(RefundPaymentUseCase);
    expect(moduleRef.get(PurchaseOrdersController)).toBeInstanceOf(PurchaseOrdersController);
    expect(moduleRef.get(PurchaseReceiptsController)).toBeInstanceOf(PurchaseReceiptsController);
    expect(moduleRef.get(PurchaseReturnsController)).toBeInstanceOf(PurchaseReturnsController);
    expect(moduleRef.get(SupplierInvoicesController)).toBeInstanceOf(SupplierInvoicesController);
    expect(moduleRef.get(ConfirmPurchaseOrderUseCase)).toBeInstanceOf(ConfirmPurchaseOrderUseCase);
    expect(moduleRef.get(GetPurchaseOrderUseCase)).toBeInstanceOf(GetPurchaseOrderUseCase);
    expect(moduleRef.get(PosRegistersController)).toBeInstanceOf(PosRegistersController);
    expect(moduleRef.get(PosShiftsController)).toBeInstanceOf(PosShiftsController);
    expect(moduleRef.get(PosSalesController)).toBeInstanceOf(PosSalesController);
    expect(moduleRef.get(PosReturnsController)).toBeInstanceOf(PosReturnsController);
    expect(moduleRef.get(StorefrontsController)).toBeInstanceOf(StorefrontsController);
    expect(moduleRef.get(StorefrontPublicController)).toBeInstanceOf(StorefrontPublicController);
    expect(moduleRef.get(ListPublishedProductsUseCase)).toBeInstanceOf(ListPublishedProductsUseCase);
    expect(moduleRef.get(AccountsController)).toBeInstanceOf(AccountsController);
    expect(moduleRef.get(FiscalPeriodsController)).toBeInstanceOf(FiscalPeriodsController);
    expect(moduleRef.get(JournalEntriesController)).toBeInstanceOf(JournalEntriesController);
    expect(moduleRef.get(AccountingReportsController)).toBeInstanceOf(AccountingReportsController);
    expect(moduleRef.get(CreateJournalEntryUseCase)).toBeInstanceOf(CreateJournalEntryUseCase);
    expect(moduleRef.get(LeadsController)).toBeInstanceOf(LeadsController);
    expect(moduleRef.get(PipelinesController)).toBeInstanceOf(PipelinesController);
    expect(moduleRef.get(OpportunitiesController)).toBeInstanceOf(OpportunitiesController);
    expect(moduleRef.get(ActivitiesController)).toBeInstanceOf(ActivitiesController);
    expect(moduleRef.get(CreateActivityUseCase)).toBeInstanceOf(CreateActivityUseCase);
    expect(moduleRef.get(BillsOfMaterialController)).toBeInstanceOf(BillsOfMaterialController);
    expect(moduleRef.get(ProductionOrdersController)).toBeInstanceOf(ProductionOrdersController);
    expect(moduleRef.get(GetProductionOrderUseCase)).toBeInstanceOf(GetProductionOrderUseCase);

    await moduleRef.close();
  });
});
