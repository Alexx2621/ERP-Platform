import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../auth";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import {
  ListAppDefinitionsUseCase,
  ListTenantAppsUseCase,
  EnableAppUseCase,
  DisableAppUseCase,
  ListAppConfigurationUseCase,
  SetAppConfigurationUseCase,
  SetAppConfigurationDto,
  AppConfigurationResponseDto,
  AppDefinitionResponseDto,
  TenantAppResponseDto,
  handleAppRegistryError,
} from "../../app-registry";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * App Registry V1 (docs/PLUGINS.md, docs/DECISIONS.md ADR-005/ADR-015).
 * Lives physically under tenants/presentation/ — like RolesController/
 * AuditEntriesController/NotificationsController/MembershipsController —
 * because it needs TenantContextGuard/CurrentTenantContext from Tenants;
 * AppRegistryModule itself has zero dependency on Tenants (a deliberate
 * leaf module since ADR-015, so every business module can import it for
 * AppEnablementGuard without risking a cycle), so this is the only
 * direction that avoids a module-loading cycle.
 */
@ApiTags("App Registry")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/apps")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class AppsController {
  constructor(
    private readonly listDefinitions: ListAppDefinitionsUseCase,
    private readonly listTenantApps: ListTenantAppsUseCase,
    private readonly enableApp: EnableAppUseCase,
    private readonly disableApp: DisableAppUseCase,
    private readonly listConfiguration: ListAppConfigurationUseCase,
    private readonly setConfiguration: SetAppConfigurationUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("definitions")
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.read")
  @ApiOperation({ summary: "The global, code-owned app catalog — every app deployed to the platform." })
  @ApiResponse({ status: HttpStatus.OK, type: [AppDefinitionResponseDto] })
  async catalog(): Promise<AppDefinitionResponseDto[]> {
    const definitions = await this.listDefinitions.execute();
    return definitions.map(AppDefinitionResponseDto.fromDomain);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.read")
  @ApiOperation({ summary: "The catalog joined with this tenant's own enablement state." })
  @ApiResponse({ status: HttpStatus.OK, type: [TenantAppResponseDto] })
  async mine(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<TenantAppResponseDto[]> {
    const summaries = await this.listTenantApps.execute(ctx.tenantId);
    return summaries.map(TenantAppResponseDto.fromDomain);
  }

  @Post(":key/enable")
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.manage")
  @ApiOperation({ summary: "Enable an app for this tenant. Idempotent; rejects if a required dependency isn't enabled." })
  @ApiResponse({ status: HttpStatus.CREATED, type: TenantAppResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Unknown app key." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "A required dependency is not enabled." })
  async enable(
    @Param("key") key: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TenantAppResponseDto> {
    try {
      const tenantApp = await this.enableApp.execute({ tenantId: ctx.tenantId, key });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "app_registry.app.enabled",
        resource: "TenantApp",
        resourceId: tenantApp.id,
        newValues: { key },
        correlationId: ctx.correlationId,
      });
      const summaries = await this.listTenantApps.execute(ctx.tenantId);
      const summary = summaries.find((app) => app.key === key);
      return TenantAppResponseDto.fromDomain(summary!);
    } catch (error) {
      handleAppRegistryError(error);
    }
  }

  @Post(":key/disable")
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.manage")
  @ApiOperation({ summary: "Disable an app for this tenant. Idempotent; rejects if another enabled app still depends on it." })
  @ApiResponse({ status: HttpStatus.CREATED, type: TenantAppResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Unknown app key." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Not enabled, or a dependent app is still enabled." })
  async disable(
    @Param("key") key: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TenantAppResponseDto> {
    try {
      const tenantApp = await this.disableApp.execute({ tenantId: ctx.tenantId, key });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "app_registry.app.disabled",
        resource: "TenantApp",
        resourceId: tenantApp.id,
        newValues: { key },
        correlationId: ctx.correlationId,
      });
      const summaries = await this.listTenantApps.execute(ctx.tenantId);
      const summary = summaries.find((app) => app.key === key);
      return TenantAppResponseDto.fromDomain(summary!);
    } catch (error) {
      handleAppRegistryError(error);
    }
  }

  @Get(":key/configuration")
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.read")
  @ApiOperation({ summary: "Configuration values for this tenant's enabled app." })
  @ApiResponse({ status: HttpStatus.OK, type: [AppConfigurationResponseDto] })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "The app is not enabled for this tenant." })
  async configuration(
    @Param("key") key: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<AppConfigurationResponseDto[]> {
    try {
      const entries = await this.listConfiguration.execute({ tenantId: ctx.tenantId, key });
      return entries.map(AppConfigurationResponseDto.fromDomain);
    } catch (error) {
      handleAppRegistryError(error);
    }
  }

  @Put(":key/configuration/:configKey")
  @UseGuards(PermissionGuard)
  @RequirePermission("apps.manage")
  @ApiOperation({ summary: "Set a configuration value for this tenant's enabled app." })
  @ApiResponse({ status: HttpStatus.OK, type: AppConfigurationResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "The app is not enabled for this tenant." })
  async setConfigurationValue(
    @Param("key") key: string,
    @Param("configKey") configKey: string,
    @Body() dto: SetAppConfigurationDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<AppConfigurationResponseDto> {
    try {
      const configuration = await this.setConfiguration.execute({
        tenantId: ctx.tenantId,
        key,
        configKey,
        value: dto.value,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "app_registry.app_configuration.changed",
        resource: "AppConfiguration",
        resourceId: configuration.id,
        newValues: { appKey: key, key: configKey, value: dto.value },
        correlationId: ctx.correlationId,
      });
      return AppConfigurationResponseDto.fromDomain(configuration);
    } catch (error) {
      handleAppRegistryError(error);
    }
  }
}
