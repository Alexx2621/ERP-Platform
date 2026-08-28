import { Body, Controller, Get, HttpStatus, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import { ListUserPreferencesUseCase } from "../application/use-cases/list-user-preferences.use-case";
import { SetUserPreferenceUseCase } from "../application/use-cases/set-user-preference.use-case";
import { SetPreferenceDto } from "./dto/set-preference.dto";
import { UserPreferenceResponseDto } from "./dto/setting-response.dto";

/**
 * No PermissionGuard/TenantContextGuard here on purpose: a preference is
 * personal and global to the User identity (docs/MULTITENANCY.md §4.8, same
 * reasoning as User itself), not a tenant-scoped administrative action —
 * every authenticated user manages their own preferences without a grant.
 */
@ApiTags("Configuration")
@ApiBearerAuth("session")
@Controller("api/v1/preferences")
@UseGuards(SessionAuthGuard)
export class PreferencesController {
  constructor(
    private readonly listPreferences: ListUserPreferencesUseCase,
    private readonly setPreference: SetUserPreferenceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "The current user's personal preferences — global to the identity, not tenant-scoped." })
  @ApiResponse({ status: HttpStatus.OK, type: [UserPreferenceResponseDto] })
  async list(@CurrentAuth() auth: AuthContext): Promise<UserPreferenceResponseDto[]> {
    const preferences = await this.listPreferences.execute(auth.user.id);
    return preferences.map(UserPreferenceResponseDto.fromDomain);
  }

  @Put(":key")
  @ApiOperation({ summary: "Set a personal preference by key. No catalog — any key/value is accepted." })
  @ApiResponse({ status: HttpStatus.OK, type: UserPreferenceResponseDto })
  async set(
    @Param("key") key: string,
    @Body() dto: SetPreferenceDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<UserPreferenceResponseDto> {
    const preference = await this.setPreference.execute({ userId: auth.user.id, key, value: dto.value });
    return UserPreferenceResponseDto.fromDomain(preference);
  }
}
