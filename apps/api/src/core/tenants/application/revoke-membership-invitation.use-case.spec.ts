import { Membership } from "../domain/membership.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { RevokeMembershipInvitationUseCase } from "./revoke-membership-invitation.use-case";
import { MembershipInvitationNotFoundError, MembershipNotInvitedError } from "./errors";

const now = new Date();

function membership(status: Membership["status"]): Membership {
  return Membership.create({
    id: "membership-1",
    tenantId: "tenant-1",
    userId: "user-1",
    status,
    createdAt: now,
    updatedAt: now,
  });
}

describe("RevokeMembershipInvitationUseCase", () => {
  it("revokes a pending invitation", async () => {
    const memberships = new InMemoryMembershipRepository();
    await memberships.save(membership("INVITED"));
    const useCase = new RevokeMembershipInvitationUseCase(memberships);

    const result = await useCase.execute({ tenantId: "tenant-1", membershipId: "membership-1" });

    expect(result.status).toBe("REVOKED");
    const saved = await memberships.findById("tenant-1", "membership-1");
    expect(saved?.status).toBe("REVOKED");
  });

  it("rejects revoking an unknown membership in the tenant", async () => {
    const memberships = new InMemoryMembershipRepository();
    const useCase = new RevokeMembershipInvitationUseCase(memberships);

    await expect(
      useCase.execute({ tenantId: "tenant-1", membershipId: "unknown" }),
    ).rejects.toThrow(MembershipInvitationNotFoundError);
  });

  it("rejects revoking an ACTIVE membership through this endpoint", async () => {
    const memberships = new InMemoryMembershipRepository();
    await memberships.save(membership("ACTIVE"));
    const useCase = new RevokeMembershipInvitationUseCase(memberships);

    await expect(
      useCase.execute({ tenantId: "tenant-1", membershipId: "membership-1" }),
    ).rejects.toThrow(MembershipNotInvitedError);
  });

  it("rejects revoking an already-revoked membership", async () => {
    const memberships = new InMemoryMembershipRepository();
    await memberships.save(membership("REVOKED"));
    const useCase = new RevokeMembershipInvitationUseCase(memberships);

    await expect(
      useCase.execute({ tenantId: "tenant-1", membershipId: "membership-1" }),
    ).rejects.toThrow(MembershipNotInvitedError);
  });
});
