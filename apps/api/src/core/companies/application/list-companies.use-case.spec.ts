import { Company } from "../domain/company.entity";
import { InMemoryCompanyRepository } from "../test-support/in-memory-company.repository";
import { ListCompaniesUseCase } from "./list-companies.use-case";

function buildCompany(overrides: Partial<Parameters<typeof Company.create>[0]> = {}) {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return Company.create({
    id: overrides.id ?? "company-1",
    tenantId: overrides.tenantId ?? "tenant-1",
    organizationId: overrides.organizationId ?? "org-1",
    code: overrides.code ?? "CO1",
    name: overrides.name ?? "Company One",
    status: overrides.status ?? "ACTIVE",
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  });
}

describe("ListCompaniesUseCase", () => {
  it("lists only active companies scoped to the given tenant", async () => {
    const companies = new InMemoryCompanyRepository();
    await companies.save(buildCompany({ id: "company-1", name: "Empresa Activa" }));
    await companies.save(buildCompany({ id: "company-2", name: "Empresa Inactiva", status: "INACTIVE" }));
    await companies.save(buildCompany({ id: "company-3", tenantId: "tenant-2", name: "Otra empresa" }));

    const result = await new ListCompaniesUseCase(companies).execute("tenant-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("company-1");
  });

  it("returns an empty list for a tenant with no companies", async () => {
    const companies = new InMemoryCompanyRepository();
    const result = await new ListCompaniesUseCase(companies).execute("tenant-1");
    expect(result).toEqual([]);
  });
});
