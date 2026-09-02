import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { GetTrialBalanceUseCase } from "../application/use-cases/get-trial-balance.use-case";
import { GetAccountLedgerUseCase } from "../application/use-cases/get-account-ledger.use-case";
import { AccountLedgerQueryDto, AccountLedgerResponseDto, AsOfDateQueryDto, TrialBalanceResponseDto } from "./dto/report.dto";
import { handleAccountingError } from "./accounting-error.mapper";
import { requireCompanyId } from "./require-company-id";

function resolveAsOfDate(asOfDate: string | undefined): Date {
  return asOfDate ? new Date(asOfDate) : new Date();
}

@ApiTags("Accounting")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/accounting/reports")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class AccountingReportsController {
  constructor(
    private readonly getTrialBalance: GetTrialBalanceUseCase,
    private readonly getAccountLedger: GetAccountLedgerUseCase,
  ) {}

  @Get("trial-balance")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.reports.read")
  @ApiOperation({ summary: "Every account with activity up to a date, with totals and a balance confirmation, freshly summed from the ledger." })
  @ApiResponse({ status: HttpStatus.OK, type: TrialBalanceResponseDto })
  async trialBalance(@Query() query: AsOfDateQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<TrialBalanceResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const result = await this.getTrialBalance.execute(ctx.tenantId, companyId, resolveAsOfDate(query.asOfDate));
      return TrialBalanceResponseDto.fromResult(result);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Get("account-ledger")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.reports.read")
  @ApiOperation({ summary: "Every posting that ever touched one account, in chronological order, with a running balance." })
  @ApiResponse({ status: HttpStatus.OK, type: AccountLedgerResponseDto })
  async accountLedger(@Query() query: AccountLedgerQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<AccountLedgerResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const result = await this.getAccountLedger.execute(ctx.tenantId, companyId, query.accountId, resolveAsOfDate(query.asOfDate));
      return AccountLedgerResponseDto.fromResult(result);
    } catch (error) {
      handleAccountingError(error);
    }
  }
}
