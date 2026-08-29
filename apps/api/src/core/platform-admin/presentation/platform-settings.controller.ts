import { Body, Controller, Get, HttpStatus, Param, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import {
  GetEffectiveSettingUseCase,
  ListPlatformSettingsUseCase,
  ListSettingDefinitionsUseCase,
  SetSettingValueUseCase,
  SettingDefinitionResponseDto,
} from "../../configuration";
import { RecordAuditEntryUseCase } from "../../audit";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { SetPlatformSettingValueDto } from "./dto/set-platform-setting-value.dto";
import { PlatformSettingResponseDto, PlatformSettingValueResponseDto } from "./dto/platform-setting-response.dto";
import { handlePlatformAdminError } from "./platform-admin-error.mapper";

/**
 * Writes the PLATFORM scope of SetSettingValueUseCase, which was
 * domain-complete since Typed Configuration was first built but had no safe
 * HTTP surface (see SettingsController's docstring) until PlatformAdminGuard
 * existed (docs/DECISIONS.md ADR-007). Gated the same way as
 * PlatformUsersController: SessionAuthGuard + PlatformAdminGuard, no
 * TenantContextGuard — a PLATFORM value has no tenant.
 */
@ApiTags("Platform Administration")
@ApiBearerAuth("session")
@Controller("api/v1/platform/settings")
@UseGuards(SessionAuthGuard, PlatformAdminGuard)
export class PlatformSettingsController {
  constructor(
    private readonly listDefinitions: ListSettingDefinitionsUseCase,
    private readonly listPlatformSettings: ListPlatformSettingsUseCase,
    private readonly getEffectiveSetting: GetEffectiveSettingUseCase,
    private readonly setSettingValue: SetSettingValueUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("definitions")
  @ApiOperation({ summary: "The global, code-owned setting catalog." })
  @ApiResponse({ status: HttpStatus.OK, type: [SettingDefinitionResponseDto] })
  async listCatalog() {
    const definitions = await this.listDefinitions.execute();
    return definitions.map(SettingDefinitionResponseDto.fromDomain);
  }

  @Get()
  @ApiOperation({ summary: "Every setting's current PLATFORM-level value (falling back to its default)." })
  @ApiResponse({ status: HttpStatus.OK, type: [PlatformSettingResponseDto] })
  async list(): Promise<PlatformSettingResponseDto[]> {
    const settings = await this.listPlatformSettings.execute();
    return settings.map(PlatformSettingResponseDto.fromEffective);
  }

  @Put(":key")
  @ApiOperation({ summary: "Set the PLATFORM-level value for a setting — the default every tenant falls back to." })
  @ApiResponse({ status: HttpStatus.OK, type: PlatformSettingValueResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Unknown setting key." })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Scope not allowed for this key, or value doesn't match its declared data type." })
  async set(
    @Param("key") key: string,
    @Body() dto: SetPlatformSettingValueDto,
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
  ): Promise<PlatformSettingValueResponseDto> {
    try {
      const before = await this.getEffectiveSetting.execute({ key });
      const value = await this.setSettingValue.execute({
        key,
        scopeType: "PLATFORM",
        tenantId: null,
        companyId: null,
        value: dto.value,
      });
      await this.recordAuditEntry.execute({
        userId: auth.user.id,
        tenantId: null,
        action: "configuration.platform_setting.changed",
        resource: "SettingValue",
        resourceId: value.id,
        previousValues: { value: before.value, source: before.source },
        newValues: { value: value.value },
        correlationId: request.correlationId,
      });
      return PlatformSettingValueResponseDto.fromDomain(key, value);
    } catch (error) {
      handlePlatformAdminError(error);
    }
  }
}
