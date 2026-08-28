import { User } from "../../users/domain/user.entity";
import { InMemoryUserRepository } from "../../users/test-support/in-memory-user.repository";
import { Membership } from "../domain/membership.entity";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { ListMembershipsUseCase } from "./list-memberships.use-case";

const now = new Date();

function user(id: string): User {
  return User.create({ id, email: `${id}@example.com`, displayName: id, status: "ACTIVE", createdAt: now, updatedAt: now });
}

function membership(id: string, tenantId: string, userId: string): Membership {
  return Membership.create({ id, tenantId, userId, status: "ACTIVE", createdAt: now, updatedAt: now });
}

describe("ListMembershipsUseCase", () => {
  it("returns only the tenant's memberships, joined with their user", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    await users.save(user("user-1"));
    await users.save(user("user-2"));
    await memberships.save(membership("membership-1", "tenant-1", "user-1"));
    await memberships.save(membership("membership-2", "tenant-2", "user-2"));
    const useCase = new ListMembershipsUseCase(memberships, users);

    const results = await useCase.execute("tenant-1");

    expect(results).toHaveLength(1);
    expect(results[0].membership.id).toBe("membership-1");
    expect(results[0].user.id).toBe("user-1");
  });

  it("returns an empty list for a tenant with no memberships", async () => {
    const users = new InMemoryUserRepository();
    const memberships = new InMemoryMembershipRepository();
    const useCase = new ListMembershipsUseCase(memberships, users);

    expect(await useCase.execute("tenant-empty")).toEqual([]);
  });
});
