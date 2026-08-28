import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { RequestNotificationUseCase } from "../../notifications";
import { AcceptMembershipInvitationUseCase } from "../application/accept-membership-invitation.use-case";
import { InviteMembershipUseCase } from "../application/invite-membership.use-case";
import { ListMembershipsUseCase } from "../application/list-memberships.use-case";
import { ListPendingInvitationsUseCase } from "../application/list-pending-invitations.use-case";
import { InviteMembershipDto } from "./dto/invite-membership.dto";
import { AcceptMembershipInvitationDto } from "./dto/accept-membership-invitation.dto";
import {
  MembershipResponseDto,
  MembershipWithUserResponseDto,
  PendingInvitationResponseDto,
} from "./dto/membership-response.dto";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import { handleTenantError } from "./tenant-error.mapper";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * `accept` deliberately has no @UseGuards(TenantContextGuard) at the class
 * level: that guard requires an already-ACTIVE membership
 * (ResolveTenantContextUseCase), which is exactly what doesn't exist yet
 * for a caller accepting a pending invitation. Only SessionAuthGuard is
 * class-wide; TenantContextGuard/PermissionGuard are applied per-method on
 * `invite`/`list`, which do need a resolved tenant + permission.
 */
@ApiTags("Tenants")
@ApiBearerAuth("session")
@Controller("api/v1/tenants/memberships")
@UseGuards(SessionAuthGuard)
export class MembershipsController {
  constructor(
    private readonly inviteMembership: InviteMembershipUseCase,
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly listPendingInvitations: ListPendingInvitationsUseCase,
    private readonly acceptInvitation: AcceptMembershipInvitationUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
    private readonly requestNotification: RequestNotificationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantContextGuard, PermissionGuard)
  @RequirePermission("tenants.memberships.manage")
  @ApiTenantHeaders()
  @ApiOperation({ summary: "Invite an existing user (by email) to the current tenant. Starts as INVITED." })
  @ApiResponse({ status: HttpStatus.CREATED, type: MembershipWithUserResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "No user exists with that email." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Already a member, or the invited user is disabled." })
  async invite(
    @Body() dto: InviteMembershipDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<MembershipWithUserResponseDto> {
    try {
      const result = await this.inviteMembership.execute({ tenantId: ctx.tenantId, email: dto.email });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "tenants.membership.invited",
        resource: "Membership",
        resourceId: result.membership.id,
        newValues: { invitedUserId: result.user.id, invitedEmail: result.user.email },
        correlationId: ctx.correlationId,
      });
      await this.requestNotification.execute({
        tenantId: ctx.tenantId,
        recipientUserId: result.user.id,
        type: "tenancy.membership_invited",
        title: "Fuiste invitado a un espacio de trabajo",
        body: "Revisa tus invitaciones pendientes para unirte.",
        data: { tenantId: ctx.tenantId, membershipId: result.membership.id },
        channels: ["IN_APP"],
      });
      return MembershipWithUserResponseDto.fromDomainWithUser(result.membership, result.user);
    } catch (error) {
      handleTenantError(error);
    }
  }

  @Get()
  @UseGuards(TenantContextGuard, PermissionGuard)
  @RequirePermission("tenants.memberships.read")
  @ApiTenantHeaders()
  @ApiOperation({ summary: "List the tenant's memberships (any status) with their user identity." })
  @ApiResponse({ status: HttpStatus.OK, type: [MembershipWithUserResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<MembershipWithUserResponseDto[]> {
    const results = await this.listMemberships.execute(ctx.tenantId);
    return results.map((result) => MembershipWithUserResponseDto.fromDomainWithUser(result.membership, result.user));
  }

  /** Cross-tenant by design, same as GET /tenants: "which invitations are waiting for me". */
  @Get("pending")
  @ApiOperation({ summary: "The authenticated user's own pending invitations, across all tenants." })
  @ApiResponse({ status: HttpStatus.OK, type: [PendingInvitationResponseDto] })
  async pending(@CurrentAuth() auth: AuthContext): Promise<PendingInvitationResponseDto[]> {
    const invitations = await this.listPendingInvitations.execute(auth.user.id);
    return invitations.map(PendingInvitationResponseDto.fromDomain);
  }

  @Post(":id/accept")
  @ApiOperation({
    summary: "Accept your own pending invitation (INVITED -> ACTIVE). No tenant context header required.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: MembershipResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "No such pending invitation for the authenticated user." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "The invitation is not in a state that can be accepted." })
  async accept(
    @Param("id") id: string,
    @Body() dto: AcceptMembershipInvitationDto,
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
  ): Promise<MembershipResponseDto> {
    try {
      const membership = await this.acceptInvitation.execute({
        tenantSlug: dto.tenantSlug,
        membershipId: id,
        userId: auth.user.id,
      });
      await this.recordAuditEntry.execute({
        userId: auth.user.id,
        tenantId: membership.tenantId,
        action: "tenants.membership.accepted",
        resource: "Membership",
        resourceId: membership.id,
        newValues: { status: membership.status },
        correlationId: request.correlationId,
      });
      return MembershipResponseDto.fromDomain(membership);
    } catch (error) {
      handleTenantError(error);
    }
  }
}
