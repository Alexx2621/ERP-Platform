import { buildAuthTestContext } from "../../test-support/build-auth-test-context";
import { SessionExpiredError, SessionNotFoundError, SessionRevokedError } from "../errors";

describe("RefreshSessionUseCase", () => {
  it("rotates the token pair and keeps the same underlying session", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const original = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    const rotated = await ctx.refresh.execute({ refreshToken: original.refreshToken });

    expect(rotated.accessToken).not.toEqual(original.accessToken);
    expect(rotated.refreshToken).not.toEqual(original.refreshToken);
    expect(rotated.user.email).toBe("ada@example.com");
  });

  it("rejects reuse of a refresh token after it has been rotated", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const original = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.refresh.execute({ refreshToken: original.refreshToken });

    await expect(ctx.refresh.execute({ refreshToken: original.refreshToken })).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it("rejects an expired refresh token", async () => {
    const ctx = buildAuthTestContext({ refreshTokenTtlSeconds: 60 });
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const original = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    ctx.clock.advanceSeconds(61);

    await expect(ctx.refresh.execute({ refreshToken: original.refreshToken })).rejects.toThrow(
      SessionExpiredError,
    );
  });

  it("rejects refreshing a revoked session", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const original = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.logout.execute(original.accessToken);

    await expect(ctx.refresh.execute({ refreshToken: original.refreshToken })).rejects.toThrow(
      SessionRevokedError,
    );
  });
});
