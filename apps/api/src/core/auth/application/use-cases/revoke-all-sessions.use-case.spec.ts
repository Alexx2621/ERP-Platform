import { buildAuthTestContext } from "../../test-support/build-auth-test-context";

describe("RevokeAllSessionsUseCase", () => {
  it("revokes every active session for the user, across multiple logins", async () => {
    const ctx = buildAuthTestContext();
    const user = await ctx.createActiveUser({
      email: "ada@example.com",
      password: "password123",
    });
    const sessionA = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });
    const sessionB = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.revokeAll.execute(user.id);

    const active = await ctx.sessions.findActiveByUserId(user.id);
    expect(active).toHaveLength(0);

    const revokedA = await ctx.sessions.findByAccessTokenHash(
      ctx.tokens.hashToken(sessionA.accessToken),
    );
    const revokedB = await ctx.sessions.findByAccessTokenHash(
      ctx.tokens.hashToken(sessionB.accessToken),
    );
    expect(revokedA?.status).toBe("REVOKED");
    expect(revokedB?.status).toBe("REVOKED");
  });

  it("does nothing when the user has no active sessions", async () => {
    const ctx = buildAuthTestContext();
    const user = await ctx.createActiveUser({
      email: "ada@example.com",
      password: "password123",
    });

    await expect(ctx.revokeAll.execute(user.id)).resolves.toBeUndefined();
  });
});
