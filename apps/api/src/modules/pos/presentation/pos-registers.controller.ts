import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePosRegisterUseCase } from "../application/use-cases/create-pos-register.use-case";
import { ListPosRegistersUseCase } from "../application/use-cases/list-pos-registers.use-case";
import { SetPosRegisterStatusUseCase } from "../application/use-cases/set-pos-register-status.use-case";
import { CreatePosRegisterDto, ListPosRegistersQueryDto, PosRegisterResponseDto, SetPosRegisterStatusDto } from "./dto/pos-register.dto";
import { handlePosError } from "./pos-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("POS")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/pos/registers")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PosRegistersController {
  constructor(
    private readonly createRegister: CreatePosRegisterUseCase,
    private readonly listRegisters: ListPosRegistersUseCase,
    private readonly setStatus: SetPosRegisterStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.registers.read")
  @ApiOperation({ summary: "List POS registers for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [PosRegisterResponseDto] })
  async list(
    @Query() query: ListPosRegistersQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosRegisterResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const registers = await this.listRegisters.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, limit: query.limit ?? 50 },
      });
      return registers.map(PosRegisterResponseDto.fromDomain);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.registers.manage")
  @ApiOperation({ summary: "Create a POS register, tied to one warehouse." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosRegisterResponseDto })
  async create(
    @Body() dto: CreatePosRegisterDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosRegisterResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const register = await this.createRegister.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pos.register.created",
        resource: "PosRegister",
        resourceId: register.id,
        newValues: { code: register.code, name: register.name, warehouseId: register.warehouseId },
        correlationId: ctx.correlationId,
      });
      return PosRegisterResponseDto.fromDomain(register);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.registers.manage")
  @ApiOperation({ summary: "Activate or deactivate a POS register." })
  @ApiResponse({ status: HttpStatus.OK, type: PosRegisterResponseDto })
  async setStatusRoute(
    @Param("id") id: string,
    @Body() dto: SetPosRegisterStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosRegisterResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const register = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pos.register.status_changed",
        resource: "PosRegister",
        resourceId: register.id,
        newValues: { status: register.status },
        correlationId: ctx.correlationId,
      });
      return PosRegisterResponseDto.fromDomain(register);
    } catch (error) {
      handlePosError(error);
    }
  }
}
