import { InMemoryUserRepository } from "../test-support/in-memory-user.repository";
import { CreateUserUseCase } from "./create-user.use-case";
import { SetUserStatusUseCase } from "./set-user-status.use-case";
import { UserNotFoundError } from "./errors";
import type { RecordAuditEntryUseCase } from "../../audit";

function buildAuditStub() {
  return { execute: jest.fn().mockResolvedValue(undefined) } as unknown as RecordAuditEntryUseCase;
}

describe("SetUserStatusUseCase", () => {
  it("disables and re-enables a user, recording an audit entry each time", async () => {
    const users = new InMemoryUserRepository();
    const audit = buildAuditStub();
    const createUser = new CreateUserUseCase(users);
    const setStatus = new SetUserStatusUseCase(users, audit);
    const user = await createUser.execute({ email: "ada@example.com", displayName: "Ada" });

    const disabled = await setStatus.execute({
      userId: user.id,
      status: "DISABLED",
      actorUserId: "admin-1",
      correlationId: "correlation-1",
    });
    expect(disabled.status).toBe("DISABLED");
    expect(disabled.isActive()).toBe(false);
    expect(audit.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        resource: "User",
        resourceId: user.id,
        action: "user.status_changed",
        previousValues: { status: "ACTIVE" },
        newValues: { status: "DISABLED" },
      }),
    );

    const reenabled = await setStatus.execute({
      userId: user.id,
      status: "ACTIVE",
      correlationId: "correlation-2",
    });
    expect(reenabled.isActive()).toBe(true);
    expect(audit.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: null, newValues: { status: "ACTIVE" } }),
    );
  });

  it("rejects setting status for an unknown user id", async () => {
    const users = new InMemoryUserRepository();
    const setStatus = new SetUserStatusUseCase(users, buildAuditStub());

    await expect(
      setStatus.execute({ userId: "unknown-id", status: "DISABLED", correlationId: "correlation-3" }),
    ).rejects.toThrow(UserNotFoundError);
  });
});
