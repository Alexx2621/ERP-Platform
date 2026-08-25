import { buildAuthTestContext } from "../../test-support/build-auth-test-context";
import { SessionNotFoundError } from "../errors";

describe("LogoutUseCase", () => {
  it("revokes the session tied to the given access token", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.logout.execute(accessToken);

    const session = await ctx.sessions.findByAccessTokenHash(ctx.tokens.hashToken(accessToken));
    expect(session?.status).toBe("REVOKED");
  });

  it("is idempotent when the session is already revoked", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.logout.execute(accessToken);
    await expect(ctx.logout.execute(accessToken)).resolves.toBeUndefined();
  });

  it("rejects logging out with a token that matches no session", async () => {
    const ctx = buildAuthTestContext();
    await expect(ctx.logout.execute("unknown-token")).rejects.toThrow(SessionNotFoundError);
  });
});
