import { Body, Controller, Get, HttpStatus, Inject, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../../auth";
import {
  AssignTenantPlanDto,
  AssignTenantPlanUseCase,
  GetTenantSubscriptionUseCase,
  PLAN_REPOSITORY,
  type PlanRepository,
  handleBillingError,
} from "../../billing";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { PlatformSubscriptionResponseDto } from "./dto/platform-subscription-response.dto";

/**
 * Cross-tenant, gated only by `PlatformAdminGuard` — the manual half of
 * docs/DECISIONS.md ADR-016's two access paths, for comping an account or
 * a sales-negotiated `Enterprise` arrangement, since V1 has no
 * tenant-facing self-service billing portal yet. No Recurrente call is
 * made from here at all — see `AssignTenantPlanUseCase`.
 */
@ApiTags("Platform Administration")
@ApiBearerAuth("session")
@Controller("api/v1/platform/tenants/:tenantId/subscription")
@UseGuards(SessionAuthGuard, PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(
    private readonly getTenantSubscription: GetTenantSubscriptionUseCase,
    private readonly assignTenantPlan: AssignTenantPlanUseCase,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: "View any tenant's subscription, across the whole platform." })
  @ApiResponse({ status: HttpStatus.OK, type: PlatformSubscriptionResponseDto })
  async get(@Param("tenantId") tenantId: string): Promise<PlatformSubscriptionResponseDto | null> {
    const subscription = await this.getTenantSubscription.execute(tenantId);
    if (!subscription) return null;
    const plan = await this.plans.findById(subscription.planId);
    return PlatformSubscriptionResponseDto.fromDomain(subscription, plan?.key ?? subscription.planId);
  }

  @Put()
  @ApiOperation({ summary: "Manually assign or change a tenant's plan (comping, Enterprise sales arrangement) — no Recurrente charge." })
  @ApiResponse({ status: HttpStatus.OK, type: PlatformSubscriptionResponseDto })
  async assign(
    @Param("tenantId") tenantId: string,
    @Body() dto: AssignTenantPlanDto,
  ): Promise<PlatformSubscriptionResponseDto> {
    try {
      const subscription = await this.assignTenantPlan.execute({ tenantId, planKey: dto.planKey });
      return PlatformSubscriptionResponseDto.fromDomain(subscription, dto.planKey);
    } catch (error) {
      handleBillingError(error);
    }
  }
}
