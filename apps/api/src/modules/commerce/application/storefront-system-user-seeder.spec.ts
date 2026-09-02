import { InMemoryUserRepository } from "../../../core/users/test-support/in-memory-user.repository";
import { StorefrontSystemUserSeeder } from "./storefront-system-user-seeder";

describe("StorefrontSystemUserSeeder", () => {
  it("creates the system user on first call and reuses the same id afterwards", async () => {
    const users = new InMemoryUserRepository();
    const seeder = new StorefrontSystemUserSeeder(users);

    const first = await seeder.ensureSeeded();
    const second = await seeder.ensureSeeded();
    expect(second).toBe(first);

    const stored = await users.findById(first);
    expect(stored?.isPlatformAdmin).toBe(false);
    expect(stored?.status).toBe("ACTIVE");
  });

  it("finds an already-seeded user (e.g. from a previous boot) instead of creating a duplicate", async () => {
    const users = new InMemoryUserRepository();
    const firstSeeder = new StorefrontSystemUserSeeder(users);
    const id = await firstSeeder.ensureSeeded();

    const secondSeeder = new StorefrontSystemUserSeeder(users);
    const resolved = await secondSeeder.ensureSeeded();
    expect(resolved).toBe(id);
  });
});
