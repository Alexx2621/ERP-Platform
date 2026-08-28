import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../../auth";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import {
  CreateRoleUseCase,
  AssignRoleUseCase,
  ListRolesUseCase,
  ListPermissionsUseCase,
  PermissionGuard,
  RequirePermission,
  CreateRoleDto,
  AssignRoleDto,
  PermissionResponseDto,
  RoleAssignmentResponseDto,
  RoleResponseDto,
  handleAccessControlError,
} from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * Physically lives in tenants/ (not access-control/) because it needs
 * SessionAuthGuard + TenantContextGuard + CurrentTenantContext, and those
 * cannot be imported from access-control without creating a module-loading
 * cycle: tenants -> access-control -> tenants. AccessControlModule itself
 * still has zero dependency on Tenants (see access-control.module.ts) — only
 * this HTTP-layer controller needs both sides, so it is homed with the
 * module that owns tenant-context resolution and imports access-control's
 * public contract for everything else (use cases, guard, DTOs).
 */
@ApiTags("Access Control")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly assignRole: AssignRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("roles")
  @UseGuards(PermissionGuard)
  @RequirePermission("access.roles.read")
  @ApiOperation({ summary: "List the tenant's roles and their permissions." })
  @ApiResponse({ status: HttpStatus.OK, type: [RoleResponseDto] })
  async listAll(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<RoleResponseDto[]> {
    const roles = await this.listRoles.execute(ctx.tenantId);
    return roles.map(RoleResponseDto.fromDomain);
  }

  @Get("permissions")
  @UseGuards(PermissionGuard)
  @RequirePermission("access.permissions.read")
  @ApiOperation({ summary: "The global, code-owned permission catalog." })
  @ApiResponse({ status: HttpStatus.OK, type: [PermissionResponseDto] })
  async listCatalog(): Promise<PermissionResponseDto[]> {
    const permissions = await this.listPermissions.execute();
    return permissions.map(PermissionResponseDto.fromDomain);
  }

  @Post("roles")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionGuard)
  @RequirePermission("access.roles.manage")
  @ApiOperation({ summary: "Create a tenant-scoped role." })
  @ApiResponse({ status: HttpStatus.CREATED, type: RoleResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Role name already in use." })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<RoleResponseDto> {
    try {
      const role = await this.createRole.execute({
        tenantId: ctx.tenantId,
        name: dto.name,
        permissionKeys: dto.permissionKeys,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "access_control.role.created",
        resource: "Role",
        resourceId: role.id,
        newValues: { name: role.name, permissionKeys: role.permissionKeys },
        correlationId: ctx.correlationId,
      });
      return RoleResponseDto.fromDomain(role);
    } catch (error) {
      handleAccessControlError(error);
    }
  }

  @Post("roles/:id/assignments")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionGuard)
  @RequirePermission("access.roles.manage")
  @ApiOperation({ summary: "Grant a role to an existing membership at TENANT or COMPANY scope." })
  @ApiResponse({ status: HttpStatus.CREATED, type: RoleAssignmentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Role or membership not found in this tenant." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Duplicate assignment." })
  async assign(
    @Param("id") roleId: string,
    @Body() dto: AssignRoleDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<RoleAssignmentResponseDto> {
    try {
      const assignment = await this.assignRole.execute({
        tenantId: ctx.tenantId,
        membershipId: dto.membershipId,
        roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId: assignment.scopeType === "COMPANY" ? assignment.scopeId : null,
        action: "access_control.role_assignment.created",
        resource: "RoleAssignment",
        resourceId: assignment.id,
        newValues: {
          membershipId: assignment.membershipId,
          roleId: assignment.roleId,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
        },
        correlationId: ctx.correlationId,
      });
      return RoleAssignmentResponseDto.fromDomain(assignment);
    } catch (error) {
      handleAccessControlError(error);
    }
  }
}
