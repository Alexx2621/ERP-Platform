import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateAccountUseCase } from "../application/use-cases/create-account.use-case";
import { UpdateAccountUseCase } from "../application/use-cases/update-account.use-case";
import { SetAccountStatusUseCase } from "../application/use-cases/set-account-status.use-case";
import { ListAccountsUseCase } from "../application/use-cases/list-accounts.use-case";
import { AccountResponseDto, CreateAccountDto, ListAccountsQueryDto, SetAccountStatusDto, UpdateAccountDto } from "./dto/account.dto";
import { handleAccountingError } from "./accounting-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Accounting")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/accounting/accounts")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class AccountsController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly updateAccount: UpdateAccountUseCase,
    private readonly setStatus: SetAccountStatusUseCase,
    private readonly listAccounts: ListAccountsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.accounts.read")
  @ApiOperation({ summary: "List the active company's Chart of Accounts." })
  @ApiResponse({ status: HttpStatus.OK, type: [AccountResponseDto] })
  async list(@Query() query: ListAccountsQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<AccountResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const accounts = await this.listAccounts.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { type: query.type, status: query.status, limit: 500 },
      });
      return accounts.map(AccountResponseDto.fromDomain);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.accounts.manage")
  @ApiOperation({ summary: "Add an account to the active company's Chart of Accounts." })
  @ApiResponse({ status: HttpStatus.CREATED, type: AccountResponseDto })
  async create(@Body() dto: CreateAccountDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<AccountResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const account = await this.createAccount.execute({ tenantId: ctx.tenantId, companyId, ...dto, parentAccountId: dto.parentAccountId ?? null });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.account.created",
        resource: "Account",
        resourceId: account.id,
        newValues: { code: account.code, name: account.name, type: account.type },
        correlationId: ctx.correlationId,
      });
      return AccountResponseDto.fromDomain(account);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.accounts.manage")
  @ApiOperation({ summary: "Rename an account." })
  @ApiResponse({ status: HttpStatus.OK, type: AccountResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<AccountResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const account = await this.updateAccount.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.account.updated",
        resource: "Account",
        resourceId: account.id,
        newValues: { name: account.name },
        correlationId: ctx.correlationId,
      });
      return AccountResponseDto.fromDomain(account);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.accounts.manage")
  @ApiOperation({ summary: "Activate or deactivate an account." })
  @ApiResponse({ status: HttpStatus.OK, type: AccountResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetAccountStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<AccountResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const account = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.account.status_changed",
        resource: "Account",
        resourceId: account.id,
        newValues: { status: account.status },
        correlationId: ctx.correlationId,
      });
      return AccountResponseDto.fromDomain(account);
    } catch (error) {
      handleAccountingError(error);
    }
  }
}
