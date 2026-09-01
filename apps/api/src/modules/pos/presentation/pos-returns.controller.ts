import { Body, Controller, Get, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePosReturnUseCase } from "../application/use-cases/create-pos-return.use-case";
import { ListPosReturnsUseCase } from "../application/use-cases/list-pos-returns.use-case";
import { CreatePosReturnDto, ListPosReturnsQueryDto, PosReturnResponseDto } from "./dto/pos-return.dto";
import { handlePosError } from "./pos-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("POS")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/pos/returns")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PosReturnsController {
  constructor(
    private readonly createReturn: CreatePosReturnUseCase,
    private readonly listReturns: ListPosReturnsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.returns.read")
  @ApiOperation({ summary: "List POS returns for the active company, optionally scoped to one shift." })
  @ApiResponse({ status: HttpStatus.OK, type: [PosReturnResponseDto] })
  async list(
    @Query() query: ListPosReturnsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosReturnResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const returns = await this.listReturns.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { shiftId: query.shiftId, limit: query.limit ?? 50 },
      });
      return returns.map(PosReturnResponseDto.fromDomain);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.returns.manage")
  @ApiOperation({
    summary:
      "Return goods from a completed POS sale, posting a real SalesReturn (and the matching inventory movement) and, if issueRefund is true, a full refund of the sale's original Payment. Idempotent by idempotencyKey.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosReturnResponseDto })
  async create(
    @Body() dto: CreatePosReturnDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosReturnResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { posReturn, wasReplayed } = await this.createReturn.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        shiftId: dto.shiftId,
        posSaleId: dto.posSaleId,
        lines: dto.lines,
        reason: dto.reason,
        issueRefund: dto.issueRefund,
        idempotencyKey: dto.idempotencyKey,
      });
      if (!wasReplayed) {
        await this.recordAuditEntry.execute({
          userId: ctx.actor.userId,
          tenantId: ctx.tenantId,
          companyId,
          action: "pos.return.created",
          resource: "PosReturn",
          resourceId: posReturn.id,
          newValues: { posSaleId: posReturn.posSaleId, refunded: posReturn.refunded, refundAmount: posReturn.refundAmount },
          correlationId: ctx.correlationId,
        });
      }
      return PosReturnResponseDto.fromDomain(posReturn);
    } catch (error) {
      handlePosError(error);
    }
  }
}
