import { Company, CompanyRepository } from "../../companies";
import { Membership } from "../domain/membership.entity";
import { Tenant } from "../domain/tenant.entity";
import { CompanyContextUnavailableError, MembershipContextInactiveError } from "./errors";
import { ResolveTenantContextUseCase } from "./resolve-tenant-context.use-case";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";

const now = new Date();

class StubCompanyRepository implements CompanyRepository {
  private readonly records = new Map<string, Company>();

  async findById(tenantId: string, id: string): Promise<Company | null> {
    const company = this.records.get(id);
    return company?.tenantId === tenantId ? company : null;
  }

  async findByCode(tenantId: string, code: string): Promise<Company | null> {
    for (const company of this.records.values()) {
      if (company.tenantId === tenantId && company.code === code) return company;
    }
    return null;
  }

  async save(company: Company): Promise<void> {
    this.records.set(company.id, company);
  }
}

function tenant(id: string, slug: string): Tenant {
  return Tenant.create({
    id,
    slug,
    name: id,
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

function membership(tenantId: string, userId: string, active = true): Membership {
  return Membership.create({
    id: `membership-${tenantId}-${userId}`,
    tenantId,
    userId,
    status: active ? "ACTIVE" : "SUSPENDED",
    createdAt: now,
    updatedAt: now,
  });
}

function company(tenantId: string): Company {
  return Company.create({
    id: `company-${tenantId}`,
    tenantId,
    organizationId: `organization-${tenantId}`,
    code: "MAIN",
    name: tenantId,
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

describe("ResolveTenantContextUseCase", () => {
  it("resolves and freezes an active membership and company in one tenant", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const companies = new StubCompanyRepository();
    await tenants.save(tenant("tenant-a", "tenant-a"));
    await memberships.save(membership("tenant-a", "user-a"));
    const tenantCompany = company("tenant-a");
    await companies.save(tenantCompany);
    const useCase = new ResolveTenantContextUseCase(tenants, memberships, companies);

    const context = await useCase.execute({
      requestId: "request-1",
      correlationId: "correlation-1",
      userId: "user-a",
      tenantSlug: "tenant-a",
      companyId: tenantCompany.id,
    });

    expect(context.tenantId).toBe("tenant-a");
    expect(context.companyId).toBe(tenantCompany.id);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.actor)).toBe(true);
  });

  it("rejects a company id belonging to another tenant", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const companies = new StubCompanyRepository();
    await tenants.save(tenant("tenant-a", "tenant-a"));
    await memberships.save(membership("tenant-a", "user-a"));
    const tenantBCompany = company("tenant-b");
    await companies.save(tenantBCompany);
    const useCase = new ResolveTenantContextUseCase(tenants, memberships, companies);

    await expect(
      useCase.execute({
        requestId: "request-1",
        correlationId: "correlation-1",
        userId: "user-a",
        tenantSlug: "tenant-a",
        companyId: tenantBCompany.id,
      }),
    ).rejects.toThrow(CompanyContextUnavailableError);
  });

  it("rejects a suspended membership", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const companies = new StubCompanyRepository();
    await tenants.save(tenant("tenant-a", "tenant-a"));
    await memberships.save(membership("tenant-a", "user-a", false));
    const useCase = new ResolveTenantContextUseCase(tenants, memberships, companies);

    await expect(
      useCase.execute({
        requestId: "request-1",
        correlationId: "correlation-1",
        userId: "user-a",
        tenantSlug: "tenant-a",
      }),
    ).rejects.toThrow(MembershipContextInactiveError);
  });
});
