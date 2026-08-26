import { Inject, Injectable } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "../../companies";
import { MEMBERSHIP_REPOSITORY, MembershipRepository } from "../domain/membership.repository";
import { TENANT_REPOSITORY, TenantRepository } from "../domain/tenant.repository";
import { normalizeTenantSlug } from "../domain/normalize-tenant-slug";
import {
  CompanyContextUnavailableError,
  MembershipContextInactiveError,
  TenantContextInactiveError,
  TenantContextNotFoundError,
} from "./errors";
import { TenantExecutionContext } from "./tenant-execution-context";

export interface ResolveTenantContextInput {
  requestId: string;
  correlationId: string;
  userId: string;
  tenantSlug: string;
  companyId?: string;
}

@Injectable()
export class ResolveTenantContextUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository,
  ) {}

  async execute(input: ResolveTenantContextInput): Promise<TenantExecutionContext> {
    const tenant = await this.tenants.findBySlug(normalizeTenantSlug(input.tenantSlug));
    if (!tenant) throw new TenantContextNotFoundError();
    if (!tenant.isActive()) throw new TenantContextInactiveError();

    const membership = await this.memberships.findByUserId(tenant.id, input.userId);
    if (!membership?.isActive()) throw new MembershipContextInactiveError();

    if (input.companyId) {
      const company = await this.companies.findById(tenant.id, input.companyId);
      if (!company?.isActive()) throw new CompanyContextUnavailableError();
    }

    return TenantExecutionContext.create({
      requestId: input.requestId,
      correlationId: input.correlationId,
      userId: input.userId,
      tenantId: tenant.id,
      membershipId: membership.id,
      companyId: input.companyId,
    });
  }
}
