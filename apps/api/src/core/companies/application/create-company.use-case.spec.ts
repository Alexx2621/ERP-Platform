import { Organization, OrganizationRepository } from "../../organizations";
import { InMemoryCompanyRepository } from "../test-support/in-memory-company.repository";
import { CreateCompanyUseCase } from "./create-company.use-case";
import { OrganizationUnavailableError } from "./errors";

class StubOrganizationRepository implements OrganizationRepository {
  private readonly records = new Map<string, Organization>();

  async findById(tenantId: string, id: string): Promise<Organization | null> {
    const organization = this.records.get(id);
    return organization?.tenantId === tenantId ? organization : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Organization | null> {
    for (const organization of this.records.values()) {
      if (organization.tenantId === tenantId && organization.code === code) return organization;
    }
    return null;
  }

  async save(organization: Organization): Promise<void> {
    this.records.set(organization.id, organization);
  }
}

function organization(tenantId: string): Organization {
  const now = new Date();
  return Organization.create({
    id: `organization-${tenantId}`,
    tenantId,
    code: "MAIN",
    name: "Main",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

describe("CreateCompanyUseCase", () => {
  it("creates a company beneath an organization in the same tenant", async () => {
    const organizations = new StubOrganizationRepository();
    const companies = new InMemoryCompanyRepository();
    const tenantOrganization = organization("tenant-a");
    await organizations.save(tenantOrganization);
    const useCase = new CreateCompanyUseCase(companies, organizations);

    const company = await useCase.execute(
      { tenantId: "tenant-a" },
      { organizationId: tenantOrganization.id, code: "ACME", name: "Acme" },
    );

    expect(company.tenantId).toBe("tenant-a");
    expect(await companies.findById("tenant-b", company.id)).toBeNull();
  });

  it("rejects an organization identifier owned by another tenant", async () => {
    const organizations = new StubOrganizationRepository();
    const companies = new InMemoryCompanyRepository();
    const tenantBOrganization = organization("tenant-b");
    await organizations.save(tenantBOrganization);
    const useCase = new CreateCompanyUseCase(companies, organizations);

    await expect(
      useCase.execute(
        { tenantId: "tenant-a" },
        { organizationId: tenantBOrganization.id, code: "ACME", name: "Acme" },
      ),
    ).rejects.toThrow(OrganizationUnavailableError);
  });
});
