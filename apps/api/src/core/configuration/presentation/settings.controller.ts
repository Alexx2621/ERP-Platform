import { Body, Controller, Get, HttpStatus, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../../auth";
import { TenantContextGuard, CurrentTenantContext } from "../../tenants";
import type { TenantExecutionContext } from "../../tenants";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { ListSettingDefinitionsUseCase } from "../application/use-cases/list-setting-definitions.use-case";
import { GetEffectiveSettingUseCase } from "../application/use-cases/get-effective-setting.use-case";
import { ListEffectiveSettingsUseCase } from "../application/use-cases/list-effective-settings.use-case";
import { SetSettingValueUseCase } from "../application/use-cases/set-setting-value.use-case";
import { SetSettingValueDto } from "./dto/set-setting-value.dto";
import {
  EffectiveSettingResponseDto,
  SettingDefinitionResponseDto,
  SettingValueResponseDto,
} from "./dto/setting-response.dto";
import { handleConfigurationError } from "./configuration-error.mapper";

/**
 * PLATFORM-scope writes are deliberately not exposed here: no
 * system-administration plane exists yet (docs/ARCHITECTURE.md §10), so a
 * public endpoint accepting `scopeType: "PLATFORM"` from any tenant-scoped
 * caller would let a tenant admin overwrite defaults for every tenant on the
 * platform — a real privilege escalation, not a missing feature. Reading
 * through PLATFORM as a fallback layer (GetEffectiveSettingUseCase) stays
 * safe and is exposed via GET /settings. See docs/SECURITY.md.
 */
@ApiTags("Configuration")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/settings")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class SettingsController {
  constructor(
    private readonly listDefinitions: ListSettingDefinitionsUseCase,
    private readonly listEffectiveSettings: ListEffectiveSettingsUseCase,
    private readonly setSettingValue: SetSettingValueUseCase,
    private readonly getEffectiveSetting: GetEffectiveSettingUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("definitions")
  @UseGuards(PermissionGuard)
  @RequirePermission("configuration.settings.read")
  @ApiOperation({ summary: "The global, code-owned setting catalog." })
  @ApiResponse({ status: HttpStatus.OK, type: [SettingDefinitionResponseDto] })
  async listCatalog(): Promise<SettingDefinitionResponseDto[]> {
    const definitions = await this.listDefinitions.execute();
    return definitions.map(SettingDefinitionResponseDto.fromDomain);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("configuration.settings.read")
  @ApiOperation({ summary: "Effective settings for the current tenant/company, resolved COMPANY → TENANT → PLATFORM → default." })
  @ApiResponse({ status: HttpStatus.OK, type: [EffectiveSettingResponseDto] })
  async listEffective(
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<EffectiveSettingResponseDto[]> {
    const settings = await this.listEffectiveSettings.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
    });
    return settings.map(EffectiveSettingResponseDto.fromDomain);
  }

  @Put(":key")
  @UseGuards(PermissionGuard)
  @RequirePermission("configuration.settings.manage")
  @ApiOperation({ summary: "Set a TENANT- or COMPANY-scoped value for a setting. PLATFORM writes are not exposed here." })
  @ApiResponse({ status: HttpStatus.OK, type: SettingValueResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Unknown setting key." })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Value doesn't match the setting's declared data type." })
  async set(
    @Param("key") key: string,
    @Body() dto: SetSettingValueDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SettingValueResponseDto> {
    try {
      const companyId = dto.scopeType === "COMPANY" ? (dto.companyId ?? null) : null;
      const before = await this.getEffectiveSetting.execute({
        key,
        tenantId: ctx.tenantId,
        companyId: companyId ?? undefined,
      });
      const value = await this.setSettingValue.execute({
        key,
        scopeType: dto.scopeType,
        tenantId: ctx.tenantId,
        companyId,
        value: dto.value,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "configuration.setting.changed",
        resource: "SettingValue",
        resourceId: value.id,
        previousValues: { value: before.value, source: before.source },
        newValues: { value: value.value, scopeType: value.scopeType, companyId: value.companyId },
        correlationId: ctx.correlationId,
      });
      return SettingValueResponseDto.fromDomain(key, value);
    } catch (error) {
      handleConfigurationError(error);
    }
  }
}
