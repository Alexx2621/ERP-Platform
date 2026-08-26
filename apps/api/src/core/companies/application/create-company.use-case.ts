import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { ORGANIZATION_REPOSITORY, OrganizationRepository } from "../../organizations";
import { Company } from "../domain/company.entity";
import { normalizeCompanyCode } from "../domain/normalize-company-code";
import { COMPANY_REPOSITORY, CompanyRepository } from "../domain/company.repository";
import { CompanyCodeAlreadyInUseError, OrganizationUnavailableError } from "./errors";

export interface CreateCompanyInput {
  organizationId: string;
  code: string;
  name: string;
}

export interface CompanyTenantContext {
  readonly tenantId: string;
}

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepository,
  ) {}

  async execute(context: CompanyTenantContext, input: CreateCompanyInput): Promise<Company> {
    const organization = await this.organizations.findById(context.tenantId, input.organizationId);
    if (!organization?.isActive()) {
      throw new OrganizationUnavailableError(context.tenantId, input.organizationId);
    }

    const code = normalizeCompanyCode(input.code);
    if (await this.companies.findByCode(context.tenantId, code)) {
      throw new CompanyCodeAlreadyInUseError(context.tenantId, code);
    }

    const now = new Date();
    const company = Company.create({
      id: newId(),
      tenantId: context.tenantId,
      organizationId: organization.id,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.companies.save(company);
    return company;
  }
}
