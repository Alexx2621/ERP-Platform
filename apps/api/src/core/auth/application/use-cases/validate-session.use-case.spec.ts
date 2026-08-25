import { buildAuthTestContext } from "../../test-support/build-auth-test-context";
import {
  AccountDisabledError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../errors";

describe("ValidateSessionUseCase", () => {
  it("accepts a freshly issued access token", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    const { user } = await ctx.validateSession.execute(accessToken);
    expect(user.email).toBe("ada@example.com");
  });

  it("rejects an access token that does not correspond to any session", async () => {
    const ctx = buildAuthTestContext();
    await expect(ctx.validateSession.execute("not-a-real-token")).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it("rejects an expired session", async () => {
    const ctx = buildAuthTestContext({ accessTokenTtlSeconds: 900 });
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    ctx.clock.advanceSeconds(901);

    await expect(ctx.validateSession.execute(accessToken)).rejects.toThrow(SessionExpiredError);
  });

  it("rejects a revoked session", async () => {
    const ctx = buildAuthTestContext();
    await ctx.createActiveUser({ email: "ada@example.com", password: "password123" });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    await ctx.logout.execute(accessToken);

    await expect(ctx.validateSession.execute(accessToken)).rejects.toThrow(SessionRevokedError);
  });

  it("rejects a session whose user was disabled after login", async () => {
    const ctx = buildAuthTestContext();
    const user = await ctx.createActiveUser({
      email: "ada@example.com",
      password: "password123",
    });
    const { accessToken } = await ctx.login.execute({
      email: "ada@example.com",
      password: "password123",
    });

    user.disable();
    await ctx.users.save(user);

    await expect(ctx.validateSession.execute(accessToken)).rejects.toThrow(AccountDisabledError);
  });
});
