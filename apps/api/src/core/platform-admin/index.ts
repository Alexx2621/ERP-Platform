/**
 * Public contract of the Platform Administration module. Other modules must
 * only import from here, never from platform-admin/presentation directly.
 */
export { PlatformAdminGuard } from "./presentation/platform-admin.guard";
export { PlatformUsersController } from "./presentation/platform-users.controller";
export { PlatformSettingsController } from "./presentation/platform-settings.controller";
export { PlatformUserResponseDto } from "./presentation/dto/platform-user-response.dto";
export {
  PlatformSettingResponseDto,
  PlatformSettingValueResponseDto,
} from "./presentation/dto/platform-setting-response.dto";
export { PlatformAdminModule } from "./platform-admin.module";
