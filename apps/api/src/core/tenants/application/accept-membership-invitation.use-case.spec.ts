import { InvalidMembershipTransitionError, Membership } from "../domain/membership.entity";
import { Tenant } from "../domain/tenant.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";
import { AcceptMembershipInvitationUseCase } from "./accept-membership-invitation.use-case";
import { InvitationExpiredError, MembershipNotFoundForUserError, TenantContextNotFoundError } from "./errors";

const now = new Date();
const TTL_SECONDS = 7 * 24 * 60 * 60;

function tenant(id: string, slug: string): Tenant {
  return Tenant.create({ id, slug, name: id, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

function invitedMembership(id: string, tenantId: string, userId: string, updatedAt: Date = now): Membership {
  return Membership.create({ id, tenantId, userId, status: "INVITED", createdAt: updatedAt, updatedAt });
}

describe("AcceptMembershipInvitationUseCase", () => {
  it("activates a pending invitation belonging to the caller", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    await memberships.save(invitedMembership("membership-1", "tenant-1", "user-1"));
    const useCase = new AcceptMembershipInvitationUseCase(tenants, memberships);

    const result = await useCase.execute({
      tenantSlug: "acme",
      membershipId: "membership-1",
      userId: "user-1",
      invitationTtlSeconds: TTL_SECONDS,
    });

    expect(result.status).toBe("ACTIVE");
    const saved = await memberships.findById("tenant-1", "membership-1");
    expect(saved?.status).toBe("ACTIVE");
  });

  it("rejects an invitation belonging to a different user (IDOR-resistant)", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    await memberships.save(invitedMembership("membership-1", "tenant-1", "user-1"));
    const useCase = new AcceptMembershipInvitationUseCase(tenants, memberships);

    await expect(
      useCase.execute({
        tenantSlug: "acme",
        membershipId: "membership-1",
        userId: "someone-else",
        invitationTtlSeconds: TTL_SECONDS,
      }),
    ).rejects.toThrow(MembershipNotFoundForUserError);
  });

  it("rejects an unknown tenant slug", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const useCase = new AcceptMembershipInvitationUseCase(tenants, memberships);

    await expect(
      useCase.execute({
        tenantSlug: "unknown",
        membershipId: "membership-1",
        userId: "user-1",
        invitationTtlSeconds: TTL_SECONDS,
      }),
    ).rejects.toThrow(TenantContextNotFoundError);
  });

  it("rejects accepting a membership that is not INVITED/SUSPENDED", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    await memberships.save(
      Membership.create({
        id: "membership-1",
        tenantId: "tenant-1",
        userId: "user-1",
        status: "REVOKED",
        createdAt: now,
        updatedAt: now,
      }),
    );
    const useCase = new AcceptMembershipInvitationUseCase(tenants, memberships);

    await expect(
      useCase.execute({
        tenantSlug: "acme",
        membershipId: "membership-1",
        userId: "user-1",
        invitationTtlSeconds: TTL_SECONDS,
      }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
  });

  it("rejects accepting an invitation past its TTL", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    await tenants.save(tenant("tenant-1", "acme"));
    const staleInvitedAt = new Date(Date.now() - (TTL_SECONDS + 60) * 1000);
    await memberships.save(invitedMembership("membership-1", "tenant-1", "user-1", staleInvitedAt));
    const useCase = new AcceptMembershipInvitationUseCase(tenants, memberships);

    await expect(
      useCase.execute({
        tenantSlug: "acme",
        membershipId: "membership-1",
        userId: "user-1",
        invitationTtlSeconds: TTL_SECONDS,
      }),
    ).rejects.toThrow(InvitationExpiredError);
  });
});
