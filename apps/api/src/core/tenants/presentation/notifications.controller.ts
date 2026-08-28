import { Controller, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../../auth";
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  NotificationResponseDto,
  ListNotificationsDto,
  handleNotificationsError,
} from "../../notifications";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * Physically lives in tenants/ for the same reason as RolesController/
 * AuditEntriesController: it needs SessionAuthGuard + TenantContextGuard,
 * and NotificationsModule is a zero-dependency leaf that must not import
 * Tenants back. No PermissionGuard on purpose — a notification's recipient
 * is always the caller themselves (`ctx.actor.userId`), so this is personal,
 * not an administrative action gated by a grant (same reasoning as
 * PreferencesController).
 */
@ApiTags("Notifications")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/notifications")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class NotificationsController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly markNotificationRead: MarkNotificationReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "The current user's notifications within this tenant." })
  @ApiResponse({ status: HttpStatus.OK, type: [NotificationResponseDto] })
  async list(
    @Query() query: ListNotificationsDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<NotificationResponseDto[]> {
    const pairs = await this.listNotifications.execute({
      tenantId: ctx.tenantId,
      recipientUserId: ctx.actor.userId,
      unreadOnly: query.unreadOnly,
      limit: query.limit,
    });
    return pairs.map(NotificationResponseDto.fromDomain);
  }

  @Put(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark one of the current user's own notifications as read." })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not found, or belongs to another tenant/recipient." })
  async markRead(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<void> {
    try {
      await this.markNotificationRead.execute({
        notificationId: id,
        tenantId: ctx.tenantId,
        recipientUserId: ctx.actor.userId,
      });
    } catch (error) {
      handleNotificationsError(error);
    }
  }
}
