import { Membership } from "../domain/membership.entity";
import { Tenant } from "../domain/tenant.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";
import { ListMyTenantsUseCase } from "./list-my-tenants.use-case";

const now = new Date();

function tenant(id: string, slug: string, status: Tenant["status"] = "ACTIVE"): Tenant {
  return Tenant.create({ id, slug, name: id, status, version: 1, createdAt: now, updatedAt: now });
}

function membership(id: string, tenantId: string, userId: string, active = true): Membership {
  return Membership.create({
    id,
    tenantId,
    userId,
    status: active ? "ACTIVE" : "REVOKED",
    createdAt: now,
    updatedAt: now,
  });
}

describe("ListMyTenantsUseCase", () => {
  it("returns only tenants with an active membership and an active tenant", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-a", "tenant-a"));
    await tenants.save(tenant("tenant-b", "tenant-b", "SUSPENDED"));
    await memberships.save(membership("m1", "tenant-a", "user-1"));
    await memberships.save(membership("m2", "tenant-b", "user-1"));
    const useCase = new ListMyTenantsUseCase(memberships, tenants);

    const result = await useCase.execute("user-1");

    expect(result).toEqual([
      { tenantId: "tenant-a", slug: "tenant-a", name: "tenant-a", membershipId: "m1" },
    ]);
  });

  it("excludes revoked memberships", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-a", "tenant-a"));
    await memberships.save(membership("m1", "tenant-a", "user-1", false));
    const useCase = new ListMyTenantsUseCase(memberships, tenants);

    expect(await useCase.execute("user-1")).toEqual([]);
  });

  it("returns nothing for a user with no memberships", async () => {
    const useCase = new ListMyTenantsUseCase(
      new InMemoryMembershipRepository(),
      new InMemoryTenantRepository(),
    );
    expect(await useCase.execute("nobody")).toEqual([]);
  });
});
