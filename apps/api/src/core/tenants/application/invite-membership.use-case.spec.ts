import { User } from "../../users/domain/user.entity";
import { InMemoryUserRepository } from "../../users/test-support/in-memory-user.repository";
import { Membership } from "../domain/membership.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InviteMembershipUseCase } from "./invite-membership.use-case";
import { InvitedUserDisabledError, InvitedUserNotFoundError, MembershipAlreadyExistsError } from "./errors";

const now = new Date();

function user(id: string, email: string, active = true): User {
  return User.create({
    id,
    email,
    displayName: id,
    status: active ? "ACTIVE" : "DISABLED",
    isPlatformAdmin: false,
    createdAt: now,
    updatedAt: now,
  });
}

describe("InviteMembershipUseCase", () => {
  it("creates an INVITED membership for an existing, active user", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    await users.save(user("user-1", "invitee@example.com"));
    const useCase = new InviteMembershipUseCase(memberships, users);

    const result = await useCase.execute({ tenantId: "tenant-1", email: "Invitee@Example.com" });

    expect(result.membership.status).toBe("INVITED");
    expect(result.membership.userId).toBe("user-1");
    expect(result.user.id).toBe("user-1");
    const saved = await memberships.findByUserId("tenant-1", "user-1");
    expect(saved?.status).toBe("INVITED");
  });

  it("rejects an email with no matching user", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    const useCase = new InviteMembershipUseCase(memberships, users);

    await expect(
      useCase.execute({ tenantId: "tenant-1", email: "nobody@example.com" }),
    ).rejects.toThrow(InvitedUserNotFoundError);
  });

  it("rejects a disabled user", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    await users.save(user("user-1", "disabled@example.com", false));
    const useCase = new InviteMembershipUseCase(memberships, users);

    await expect(
      useCase.execute({ tenantId: "tenant-1", email: "disabled@example.com" }),
    ).rejects.toThrow(InvitedUserDisabledError);
  });

  it("rejects a user who already has a membership in the tenant", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    await users.save(user("user-1", "existing@example.com"));
    await memberships.save(
      Membership.create({
        id: "membership-1",
        tenantId: "tenant-1",
        userId: "user-1",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
    );
    const useCase = new InviteMembershipUseCase(memberships, users);

    await expect(
      useCase.execute({ tenantId: "tenant-1", email: "existing@example.com" }),
    ).rejects.toThrow(MembershipAlreadyExistsError);
  });
});
