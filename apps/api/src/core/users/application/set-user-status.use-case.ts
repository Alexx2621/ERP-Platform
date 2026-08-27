import { Inject, Injectable } from "@nestjs/common";
import { User, UserStatus } from "../domain/user.entity";
import { USER_REPOSITORY, UserRepository } from "../domain/user.repository";
import { RecordAuditEntryUseCase } from "../../audit";
import { UserNotFoundError } from "./errors";

export interface SetUserStatusInput {
  userId: string;
  status: UserStatus;
  /** Null/omitted when there is no HTTP caller yet (no admin endpoint exists) — see docs/SECURITY.md "Audit". */
  actorUserId?: string | null;
  correlationId: string;
}

@Injectable()
export class SetUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  async execute(input: SetUserStatusInput): Promise<User> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const previousStatus = user.status;
    if (input.status === "DISABLED") {
      user.disable();
    } else {
      user.enable();
    }

    await this.users.save(user);
    await this.recordAuditEntry.execute({
      userId: input.actorUserId ?? null,
      tenantId: null,
      action: "user.status_changed",
      resource: "User",
      resourceId: user.id,
      previousValues: { status: previousStatus },
      newValues: { status: user.status },
      correlationId: input.correlationId,
    });
    return user;
  }
}
