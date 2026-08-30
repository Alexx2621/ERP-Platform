import { Membership } from "../domain/membership.entity";
import { Tenant } from "../domain/tenant.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";
import { ListPendingInvitationsUseCase } from "./list-pending-invitations.use-case";

const now = new Date();
const TTL_SECONDS = 7 * 24 * 60 * 60;

function tenant(id: string, slug: string): Tenant {
  return Tenant.create({ id, slug, name: `Tenant ${id}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

describe("ListPendingInvitationsUseCase", () => {
  it("returns only the user's INVITED memberships, joined with tenant identity", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    await memberships.save(
      Membership.create({ id: "m1", tenantId: "tenant-1", userId: "user-1", status: "INVITED", createdAt: now, updatedAt: now }),
    );
    await memberships.save(
      Membership.create({ id: "m2", tenantId: "tenant-1", userId: "user-1", status: "ACTIVE", createdAt: now, updatedAt: now }),
    );
    const useCase = new ListPendingInvitationsUseCase(memberships, tenants);

    const results = await useCase.execute("user-1", TTL_SECONDS);

    expect(results).toHaveLength(1);
    expect(results[0].membership.id).toBe("m1");
    expect(results[0].tenantSlug).toBe("acme");
  });

  it("returns an empty list for a user with no pending invitations", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const useCase = new ListPendingInvitationsUseCase(memberships, tenants);

    expect(await useCase.execute("user-none", TTL_SECONDS)).toEqual([]);
  });

  it("excludes an invitation past its TTL, since it can no longer be accepted", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    const staleInvitedAt = new Date(Date.now() - (TTL_SECONDS + 60) * 1000);
    await memberships.save(
      Membership.create({
        id: "m1",
        tenantId: "tenant-1",
        userId: "user-1",
        status: "INVITED",
        createdAt: staleInvitedAt,
        updatedAt: staleInvitedAt,
      }),
    );
    const useCase = new ListPendingInvitationsUseCase(memberships, tenants);

    expect(await useCase.execute("user-1", TTL_SECONDS)).toEqual([]);
  });
});
