import { User, UserRepository } from "../../users";
import { ProvisionTenantUseCase } from "./provision-tenant.use-case";
import { TenantSlugAlreadyInUseError } from "./errors";
import { InMemoryMembershipRepository } from "../test-support/in-memory-membership.repository";
import { InMemoryTenantProvisioningRepository } from "../test-support/in-memory-tenant-provisioning.repository";
import { InMemoryTenantRepository } from "../test-support/in-memory-tenant.repository";

class StubUserRepository implements UserRepository {
  private readonly records = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.records.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.records.values()) if (user.email === email) return user;
    return null;
  }

  async save(user: User): Promise<void> {
    this.records.set(user.id, user);
  }
}

function activeUser(id: string): User {
  const now = new Date();
  return User.create({
    id,
    email: `${id}@example.com`,
    displayName: id,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
}

describe("ProvisionTenantUseCase", () => {
  it("atomically describes an active tenant, owner membership, organization and company", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const provisioning = new InMemoryTenantProvisioningRepository(tenants, memberships);
    const users = new StubUserRepository();
    await users.save(activeUser("owner-a"));
    const useCase = new ProvisionTenantUseCase(tenants, provisioning, users);

    const result = await useCase.execute({
      slug: " acme-gt ",
      name: "Acme Guatemala",
      ownerUserId: "owner-a",
      organization: { code: "main", name: "Acme Group" },
      company: { code: "gt01", name: "Acme GT" },
    });

    expect(result.tenant.status).toBe("ACTIVE");
    expect(result.ownerMembership.tenantId).toBe(result.tenant.id);
    expect(result.organization.tenantId).toBe(result.tenant.id);
    expect(result.company?.organizationId).toBe(result.organization.id);
  });

  it("is idempotent for the same natural provisioning identity", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const provisioning = new InMemoryTenantProvisioningRepository(tenants, memberships);
    const users = new StubUserRepository();
    await users.save(activeUser("owner-a"));
    const useCase = new ProvisionTenantUseCase(tenants, provisioning, users);
    const input = {
      slug: "acme-gt",
      name: "Acme Guatemala",
      ownerUserId: "owner-a",
      organization: { code: "MAIN", name: "Acme Group" },
      company: { code: "GT01", name: "Acme GT" },
    };

    const first = await useCase.execute(input);
    const retry = await useCase.execute(input);

    expect(retry.tenant.id).toBe(first.tenant.id);
    expect(retry.ownerMembership.id).toBe(first.ownerMembership.id);
  });

  it("does not let another user claim an existing tenant slug", async () => {
    const tenants = new InMemoryTenantRepository();
    const memberships = new InMemoryMembershipRepository();
    const provisioning = new InMemoryTenantProvisioningRepository(tenants, memberships);
    const users = new StubUserRepository();
    await users.save(activeUser("owner-a"));
    await users.save(activeUser("owner-b"));
    const useCase = new ProvisionTenantUseCase(tenants, provisioning, users);
    const base = {
      slug: "acme-gt",
      name: "Acme",
      organization: { code: "MAIN", name: "Acme" },
    };
    await useCase.execute({ ...base, ownerUserId: "owner-a" });

    await expect(useCase.execute({ ...base, ownerUserId: "owner-b" })).rejects.toThrow(
      TenantSlugAlreadyInUseError,
    );
  });
});
