import type { ExecutionContext } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { User } from "../../users";
import { PlatformAdminGuard } from "./platform-admin.guard";

const now = new Date();

function user(isPlatformAdmin: boolean): User {
  return User.create({
    id: "user-1",
    email: "user-1@example.com",
    displayName: "User One",
    status: "ACTIVE",
    isPlatformAdmin,
    createdAt: now,
    updatedAt: now,
  });
}

function buildContext(authContext: unknown): ExecutionContext {
  const request = { authContext };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("PlatformAdminGuard", () => {
  const guard = new PlatformAdminGuard();

  it("allows the request through for a platform admin", () => {
    const context = buildContext({ user: user(true), session: {} });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects a regular authenticated user with 403 PLATFORM_ADMIN_REQUIRED", () => {
    const context = buildContext({ user: user(false), session: {} });

    try {
      guard.canActivate(context);
      throw new Error("expected canActivate to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect(error).toMatchObject({ code: "PLATFORM_ADMIN_REQUIRED" });
      expect((error as AppException).getStatus()).toBe(403);
    }
  });

  it("rejects with a 500-style error when SessionAuthGuard has not populated authContext", () => {
    const context = buildContext(undefined);

    try {
      guard.canActivate(context);
      throw new Error("expected canActivate to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect(error).toMatchObject({ code: "PLATFORM_ADMIN_GUARD_REQUIRES_AUTH" });
      expect((error as AppException).getStatus()).toBe(500);
    }
  });
});
