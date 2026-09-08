import { Body, Controller, Get, HttpStatus, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard, CurrentAuth, type AuthContext } from "../../auth";
import { TenantContextGuard, CurrentTenantContext } from "../../tenants";
import type { TenantExecutionContext } from "../../tenants";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { CreateCheckoutSessionUseCase } from "../application/use-cases/create-checkout-session.use-case";
import { GetTenantSubscriptionUseCase } from "../application/use-cases/get-tenant-subscription.use-case";
import { PLAN_REPOSITORY, PlanRepository } from "../domain/plan.repository";
import { CheckoutSessionResponseDto, CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { TenantSubscriptionResponseDto } from "./dto/tenant-subscription-response.dto";
import { handleBillingError } from "./billing-error.mapper";

/**
 * Tenant-scoped billing surface — the real self-service half of
 * docs/DECISIONS.md ADR-016's two access paths (checkout here; manual
 * assignment via `PlatformSubscriptionsController`). Subscriptions are
 * per-tenant, not per-company, so only `TenantContextGuard` applies —
 * no `AppEnablementGuard`/`RequireApp`, since Billing is not itself a
 * FOUNDATION_APPS entry (it is what *grants* app entitlement, not an
 * app a tenant enables/disables for itself).
 */
@ApiTags("Billing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/billing")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class BillingController {
  constructor(
    private readonly createCheckoutSession: CreateCheckoutSessionUseCase,
    private readonly getTenantSubscription: GetTenantSubscriptionUseCase,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("subscription")
  @UseGuards(PermissionGuard)
  @RequirePermission("billing.subscription.read")
  @ApiOperation({ summary: "View this tenant's own subscription, if any." })
  @ApiResponse({ status: HttpStatus.OK, type: TenantSubscriptionResponseDto, description: "Or 204 if the tenant never subscribed." })
  async getSubscription(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<TenantSubscriptionResponseDto | null> {
    const subscription = await this.getTenantSubscription.execute(ctx.tenantId);
    if (!subscription) return null;
    const plan = await this.plans.findById(subscription.planId);
    return TenantSubscriptionResponseDto.fromDomain(subscription, plan?.key ?? subscription.planId);
  }

  @Post("checkout")
  @UseGuards(PermissionGuard)
  @RequirePermission("billing.checkout.create")
  @ApiOperation({ summary: "Create a real, hosted Recurrente checkout session for this tenant to subscribe or change plan." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CheckoutSessionResponseDto })
  async checkout(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
    @CurrentAuth() auth: AuthContext,
  ): Promise<CheckoutSessionResponseDto> {
    try {
      const result = await this.createCheckoutSession.execute({
        tenantId: ctx.tenantId,
        planKey: dto.planKey,
        customerEmail: auth.user.email,
        customerName: auth.user.displayName,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        action: "billing.checkout.created",
        resource: "TenantSubscription",
        resourceId: ctx.tenantId,
        newValues: { planKey: dto.planKey },
        correlationId: ctx.correlationId,
      });
      const response = new CheckoutSessionResponseDto();
      response.checkoutUrl = result.checkoutUrl;
      return response;
    } catch (error) {
      handleBillingError(error);
    }
  }
}
