import { CreateUserUseCase } from "../../../users/application/create-user.use-case";
import { EmailAlreadyInUseError } from "../../../users";
import { buildAuthTestContext } from "../../test-support/build-auth-test-context";
import { RegisterUseCase } from "./register.use-case";

describe("RegisterUseCase", () => {
  it("creates the user, sets the password, and returns a live session", async () => {
    const ctx = buildAuthTestContext();
    const createUser = new CreateUserUseCase(ctx.users);
    const registerUseCase = new RegisterUseCase(createUser, ctx.setPassword, ctx.login);

    const result = await registerUseCase.execute({
      email: "new-user@example.com",
      password: "a-strong-password",
      displayName: "New User",
    });

    expect(result.user.email).toBe("new-user@example.com");
    expect(result.accessToken).toEqual(expect.any(String));

    const stored = await ctx.users.findByEmail("new-user@example.com");
    expect(stored?.isActive()).toBe(true);
  });

  it("rejects registering an email that is already in use", async () => {
    const ctx = buildAuthTestContext();
    const createUser = new CreateUserUseCase(ctx.users);
    await createUser.execute({ email: "taken@example.com", displayName: "Existing" });

    const registerUseCase = new RegisterUseCase(createUser, ctx.setPassword, ctx.login);

    await expect(
      registerUseCase.execute({
        email: "taken@example.com",
        password: "a-strong-password",
        displayName: "New User",
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
