import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateJournalEntryUseCase } from "../application/use-cases/create-journal-entry.use-case";
import { ReverseJournalEntryUseCase } from "../application/use-cases/reverse-journal-entry.use-case";
import { ListJournalEntriesUseCase } from "../application/use-cases/list-journal-entries.use-case";
import { GetJournalEntryUseCase } from "../application/use-cases/get-journal-entry.use-case";
import { ListJournalEntryLinesUseCase } from "../application/use-cases/list-journal-entry-lines.use-case";
import {
  CreateJournalEntryDto,
  JournalEntryLineResponseDto,
  JournalEntryResponseDto,
  ListJournalEntriesQueryDto,
  ReverseJournalEntryDto,
} from "./dto/journal-entry.dto";
import { handleAccountingError } from "./accounting-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Accounting")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/accounting/journal-entries")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("accounting")
export class JournalEntriesController {
  constructor(
    private readonly createJournalEntry: CreateJournalEntryUseCase,
    private readonly reverseJournalEntry: ReverseJournalEntryUseCase,
    private readonly listJournalEntries: ListJournalEntriesUseCase,
    private readonly getJournalEntry: GetJournalEntryUseCase,
    private readonly listJournalEntryLines: ListJournalEntryLinesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.entries.read")
  @ApiOperation({ summary: "List the active company's journal entries, most recent first." })
  @ApiResponse({ status: HttpStatus.OK, type: [JournalEntryResponseDto] })
  async list(@Query() query: ListJournalEntriesQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<JournalEntryResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const entries = await this.listJournalEntries.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { fiscalPeriodId: query.fiscalPeriodId, limit: query.limit ?? 50 },
      });
      return entries.map(JournalEntryResponseDto.fromDomain);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.entries.read")
  @ApiOperation({ summary: "Get one journal entry." })
  @ApiResponse({ status: HttpStatus.OK, type: JournalEntryResponseDto })
  async get(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<JournalEntryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const entry = await this.getJournalEntry.execute({ tenantId: ctx.tenantId, companyId, id });
      return JournalEntryResponseDto.fromDomain(entry);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.entries.read")
  @ApiOperation({ summary: "List a journal entry's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [JournalEntryLineResponseDto] })
  async listLines(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<JournalEntryLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listJournalEntryLines.execute({ tenantId: ctx.tenantId, companyId, journalEntryId: id });
      return lines.map(JournalEntryLineResponseDto.fromDomain);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.entries.manage")
  @ApiOperation({ summary: "Post a manual, balanced double-entry journal entry." })
  @ApiResponse({ status: HttpStatus.CREATED, type: JournalEntryResponseDto })
  async create(@Body() dto: CreateJournalEntryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<JournalEntryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const result = await this.createJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        entryDate: dto.entryDate,
        description: dto.description,
        lines: dto.lines,
      });
      if (!result.wasReplayed) {
        await this.recordAuditEntry.execute({
          userId: ctx.actor.userId,
          tenantId: ctx.tenantId,
          companyId,
          action: "accounting.journal_entry.posted",
          resource: "JournalEntry",
          resourceId: result.entry.id,
          newValues: { entryDate: dto.entryDate, description: result.entry.description, lineCount: dto.lines.length },
          correlationId: ctx.correlationId,
        });
      }
      return JournalEntryResponseDto.fromDomain(result.entry);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Post(":id/reverse")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.entries.manage")
  @ApiOperation({ summary: "Reverse a journal entry — posts a brand-new balanced entry with every line's debit/credit swapped; never edits the original." })
  @ApiResponse({ status: HttpStatus.CREATED, type: JournalEntryResponseDto })
  async reverse(
    @Param("id") id: string,
    @Body() dto: ReverseJournalEntryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<JournalEntryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const reversal = await this.reverseJournalEntry.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        journalEntryId: id,
        entryDate: dto.entryDate,
        description: dto.description,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.journal_entry.reversed",
        resource: "JournalEntry",
        resourceId: id,
        newValues: { reversingEntryId: reversal.id },
        correlationId: ctx.correlationId,
      });
      return JournalEntryResponseDto.fromDomain(reversal);
    } catch (error) {
      handleAccountingError(error);
    }
  }
}
