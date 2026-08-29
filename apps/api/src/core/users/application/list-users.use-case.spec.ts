import { User } from "../domain/user.entity";
import { InMemoryUserRepository } from "../test-support/in-memory-user.repository";
import { ListUsersUseCase } from "./list-users.use-case";

const now = new Date();

function user(id: string, offsetMs: number): User {
  return User.create({
    id,
    email: `${id}@example.com`,
    displayName: id,
    status: "ACTIVE",
    isPlatformAdmin: false,
    createdAt: new Date(now.getTime() + offsetMs),
    updatedAt: new Date(now.getTime() + offsetMs),
  });
}

describe("ListUsersUseCase", () => {
  it("lists users oldest first, across every tenant", async () => {
    const users = new InMemoryUserRepository();
    await users.save(user("user-b", 1000));
    await users.save(user("user-a", 0));
    const useCase = new ListUsersUseCase(users);

    const result = await useCase.execute();

    expect(result.map((u) => u.id)).toEqual(["user-a", "user-b"]);
  });

  it("caps the limit at 200 even when a larger value is requested", async () => {
    const users = new InMemoryUserRepository();
    await users.save(user("user-a", 0));
    const useCase = new ListUsersUseCase(users);

    await expect(useCase.execute(10_000)).resolves.toHaveLength(1);
  });

  it("defaults to 50 when no limit is given", async () => {
    const users = new InMemoryUserRepository();
    for (let i = 0; i < 60; i++) {
      await users.save(user(`user-${i}`, i));
    }
    const useCase = new ListUsersUseCase(users);

    await expect(useCase.execute()).resolves.toHaveLength(50);
  });
});
