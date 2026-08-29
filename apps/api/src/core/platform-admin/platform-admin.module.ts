import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { UsersModule } from "../users";
import { PlatformAdminGuard } from "./presentation/platform-admin.guard";
import { PlatformUsersController } from "./presentation/platform-users.controller";

/**
 * The platform-administration bounded context (docs/DECISIONS.md ADR-007):
 * cross-tenant capabilities gated by `isPlatformAdmin`, never by tenant
 * membership. Deliberately has zero dependency on Tenants/AccessControl —
 * everything here operates on global User identities.
 */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [PlatformUsersController],
  providers: [PlatformAdminGuard],
  exports: [PlatformAdminGuard],
})
export class PlatformAdminModule {}
