import { InMemoryUserRepository } from "../test-support/in-memory-user.repository";
import { CreateUserUseCase } from "./create-user.use-case";
import { EmailAlreadyInUseError } from "./errors";

describe("CreateUserUseCase", () => {
  it("creates an active user with a normalized email", async () => {
    const users = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(users);

    const user = await useCase.execute({ email: "  Ada@Example.com  ", displayName: "Ada" });

    expect(user.email).toBe("ada@example.com");
    expect(user.status).toBe("ACTIVE");
    expect(await users.findByEmail("ada@example.com")).not.toBeNull();
  });

  it("rejects creating a second user with the same normalized email", async () => {
    const users = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(users);
    await useCase.execute({ email: "ada@example.com", displayName: "Ada" });

    await expect(
      useCase.execute({ email: "ADA@EXAMPLE.COM", displayName: "Ada Duplicate" }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
