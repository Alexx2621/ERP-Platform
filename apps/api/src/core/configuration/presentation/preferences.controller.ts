import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
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
@Controller("api/v1/preferences")
@UseGuards(SessionAuthGuard)
export class PreferencesController {
  constructor(
    private readonly listPreferences: ListUserPreferencesUseCase,
    private readonly setPreference: SetUserPreferenceUseCase,
  ) {}

  @Get()
  async list(@CurrentAuth() auth: AuthContext): Promise<UserPreferenceResponseDto[]> {
    const preferences = await this.listPreferences.execute(auth.user.id);
    return preferences.map(UserPreferenceResponseDto.fromDomain);
  }

  @Put(":key")
  async set(
    @Param("key") key: string,
    @Body() dto: SetPreferenceDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<UserPreferenceResponseDto> {
    const preference = await this.setPreference.execute({ userId: auth.user.id, key, value: dto.value });
    return UserPreferenceResponseDto.fromDomain(preference);
  }
}
