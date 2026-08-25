import { InMemoryUserRepository } from "../test-support/in-memory-user.repository";
import { CreateUserUseCase } from "./create-user.use-case";
import { SetUserStatusUseCase } from "./set-user-status.use-case";
import { UserNotFoundError } from "./errors";

describe("SetUserStatusUseCase", () => {
  it("disables and re-enables a user", async () => {
    const users = new InMemoryUserRepository();
    const createUser = new CreateUserUseCase(users);
    const setStatus = new SetUserStatusUseCase(users);
    const user = await createUser.execute({ email: "ada@example.com", displayName: "Ada" });

    const disabled = await setStatus.execute(user.id, "DISABLED");
    expect(disabled.status).toBe("DISABLED");
    expect(disabled.isActive()).toBe(false);

    const reenabled = await setStatus.execute(user.id, "ACTIVE");
    expect(reenabled.isActive()).toBe(true);
  });

  it("rejects setting status for an unknown user id", async () => {
    const users = new InMemoryUserRepository();
    const setStatus = new SetUserStatusUseCase(users);

    await expect(setStatus.execute("unknown-id", "DISABLED")).rejects.toThrow(UserNotFoundError);
  });
});
