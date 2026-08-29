import { Body, Controller, Get, HttpStatus, Param, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import { ListUsersUseCase, SetUserStatusUseCase } from "../../users";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { ListPlatformUsersDto } from "./dto/list-platform-users.dto";
import { SetPlatformUserStatusDto } from "./dto/set-platform-user-status.dto";
import { PlatformUserResponseDto } from "./dto/platform-user-response.dto";
import { handlePlatformAdminError } from "./platform-admin-error.mapper";

/**
 * Cross-tenant by design — the global identity list/status action, not a
 * tenant-scoped one (no TenantContextGuard here). Gated by PlatformAdminGuard
 * on top of SessionAuthGuard: only a User with isPlatformAdmin=true can
 * reach any route in this controller (docs/DECISIONS.md ADR-007).
 */
@ApiTags("Platform Administration")
@ApiBearerAuth("session")
@Controller("api/v1/platform/users")
@UseGuards(SessionAuthGuard, PlatformAdminGuard)
export class PlatformUsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly setUserStatus: SetUserStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all users on the platform, across every tenant." })
  @ApiResponse({ status: HttpStatus.OK, type: [PlatformUserResponseDto] })
  async list(@Query() query: ListPlatformUsersDto): Promise<PlatformUserResponseDto[]> {
    const users = await this.listUsers.execute(query.limit);
    return users.map(PlatformUserResponseDto.fromDomain);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Enable or disable a user's account platform-wide." })
  @ApiResponse({ status: HttpStatus.OK, type: PlatformUserResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "No user exists with this id." })
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetPlatformUserStatusDto,
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
  ): Promise<PlatformUserResponseDto> {
    try {
      const user = await this.setUserStatus.execute({
        userId: id,
        status: dto.status,
        actorUserId: auth.user.id,
        correlationId: request.correlationId,
      });
      return PlatformUserResponseDto.fromDomain(user);
    } catch (error) {
      handlePlatformAdminError(error);
    }
  }
}
