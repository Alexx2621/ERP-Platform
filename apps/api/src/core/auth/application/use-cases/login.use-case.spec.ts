import { buildAuthTestContext } from "../../test-support/build-auth-test-context";
import { AccountDisabledError, InvalidCredentialsError } from "../errors";

describe("LoginUseCase", () => {
  it("issues an access and refresh token for a valid email/password", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "correct-horse-battery" });

    const result = await ctx.login.execute({
      email: "ada@example.com",
      password: "correct-horse-battery",
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.accessToken).not.toEqual(result.refreshToken);
    expect(result.user.email).toBe("ada@example.com");

    const stored = await ctx.sessions.findByAccessTokenHash(ctx.tokens.hashToken(result.accessToken));
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("ACTIVE");
  });

  it("rejects an invalid password without creating a session", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "correct-horse-battery" });

    await expect(
      ctx.login.execute({ email: "ada@example.com", password: "wrong-password" }),
    ).rejects.toThrow(InvalidCredentialsError);

    const activeSessions = await ctx.sessions.findActiveByUserId(
      (await ctx.users.findByEmail("ada@example.com"))!.id,
    );
    expect(activeSessions).toHaveLength(0);
  });

  it("rejects login for an email that was never registered", async () => {
    const ctx = buildAuthTestContext();

    await expect(
      ctx.login.execute({ email: "nobody@example.com", password: "anything" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("rejects login for a disabled user, even with the correct password", async () => {
    const ctx = buildAuthTestContext();
    const user = await ctx.createActiveUser({
      email: "ada@example.com",
      password: "correct-horse-battery",
    });
    user.disable();
    await ctx.users.save(user);

    await expect(
      ctx.login.execute({ email: "ada@example.com", password: "correct-horse-battery" }),
    ).rejects.toThrow(AccountDisabledError);
  });

  it("normalizes email casing/whitespace before lookup", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "correct-horse-battery" });

    const result = await ctx.login.execute({
      email: "  Ada@Example.com  ",
      password: "correct-horse-battery",
    });

    expect(result.user.email).toBe("ada@example.com");
  });
});
