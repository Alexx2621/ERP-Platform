import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateCustomerUseCase } from "../application/use-cases/create-customer.use-case";
import { UpdateCustomerUseCase } from "../application/use-cases/update-customer.use-case";
import { ListCustomersUseCase } from "../application/use-cases/list-customers.use-case";
import { SetCustomerStatusUseCase } from "../application/use-cases/set-customer-status.use-case";
import {
  CreateCustomerDto,
  CustomerResponseDto,
  SetCustomerStatusDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";
import { handleCustomerError } from "./customers-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Customers")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/customers")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("customers")
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly listCustomers: ListCustomersUseCase,
    private readonly setStatus: SetCustomerStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "List the active company's customers." })
  @ApiResponse({ status: HttpStatus.OK, type: [CustomerResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<CustomerResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const customers = await this.listCustomers.execute(ctx.tenantId, companyId);
      return customers.map(CustomerResponseDto.fromDomain);
    } catch (error) {
      handleCustomerError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("customers.manage")
  @ApiOperation({ summary: "Create a customer for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CustomerResponseDto })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CustomerResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const customer = await this.createCustomer.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "customers.customer.created",
        resource: "Customer",
        resourceId: customer.id,
        newValues: { code: customer.code, name: customer.name },
        correlationId: ctx.correlationId,
      });
      return CustomerResponseDto.fromDomain(customer);
    } catch (error) {
      handleCustomerError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("customers.manage")
  @ApiOperation({ summary: "Update a customer." })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CustomerResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const customer = await this.updateCustomer.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "customers.customer.updated",
        resource: "Customer",
        resourceId: customer.id,
        newValues: { name: customer.name },
        correlationId: ctx.correlationId,
      });
      return CustomerResponseDto.fromDomain(customer);
    } catch (error) {
      handleCustomerError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("customers.manage")
  @ApiOperation({ summary: "Activate or deactivate a customer." })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetCustomerStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CustomerResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const customer = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "customers.customer.status_changed",
        resource: "Customer",
        resourceId: customer.id,
        newValues: { status: customer.status },
        correlationId: ctx.correlationId,
      });
      return CustomerResponseDto.fromDomain(customer);
    } catch (error) {
      handleCustomerError(error);
    }
  }
}
