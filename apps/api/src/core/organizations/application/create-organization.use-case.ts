import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Organization } from "../domain/organization.entity";
import { normalizeOrganizationCode } from "../domain/normalize-organization-code";
import { ORGANIZATION_REPOSITORY, OrganizationRepository } from "../domain/organization.repository";
import { OrganizationCodeAlreadyInUseError } from "./errors";

export interface CreateOrganizationInput {
  name: string;
  code: string;
}

export interface OrganizationTenantContext {
  readonly tenantId: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepository,
  ) {}

  async execute(
    context: OrganizationTenantContext,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const code = normalizeOrganizationCode(input.code);
    if (await this.organizations.findByCode(context.tenantId, code)) {
      throw new OrganizationCodeAlreadyInUseError(context.tenantId, code);
    }

    const now = new Date();
    const organization = Organization.create({
      id: newId(),
      tenantId: context.tenantId,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.organizations.save(organization);
    return organization;
  }
}
