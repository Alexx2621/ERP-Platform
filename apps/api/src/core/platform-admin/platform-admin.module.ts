import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { UsersModule } from "../users";
import { ConfigurationModule } from "../configuration";
import { AuditModule } from "../audit";
import { PlatformAdminGuard } from "./presentation/platform-admin.guard";
import { PlatformUsersController } from "./presentation/platform-users.controller";
import { PlatformSettingsController } from "./presentation/platform-settings.controller";
import { PlatformAuditEntriesController } from "./presentation/platform-audit-entries.controller";

/**
 * The platform-administration bounded context (docs/DECISIONS.md ADR-007):
 * cross-tenant capabilities gated by `isPlatformAdmin`, never by tenant
 * membership. Importing ConfigurationModule for PLATFORM-scoped settings
 * writes creates no cycle — Configuration has no dependency back on this
 * module. AuditModule is imported directly (not just transitively via
 * ConfigurationModule, which does not re-export it) because
 * PlatformSettingsController/PlatformAuditEntriesController inject
 * RecordAuditEntryUseCase/ListPlatformAuditEntriesUseCase themselves.
 */
@Module({
  imports: [AuthModule, UsersModule, ConfigurationModule, AuditModule],
  controllers: [PlatformUsersController, PlatformSettingsController, PlatformAuditEntriesController],
  providers: [PlatformAdminGuard],
  exports: [PlatformAdminGuard],
})
export class PlatformAdminModule {}
