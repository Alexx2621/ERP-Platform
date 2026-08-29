import { Inject, Injectable } from "@nestjs/common";
import { User } from "../domain/user.entity";
import { USER_REPOSITORY, type UserRepository } from "../domain/user.repository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Cross-tenant by design — the global identity list, not any tenant's
 * member list (see ListMembershipsUseCase for that). Only reachable behind
 * PlatformAdminGuard (docs/DECISIONS.md ADR-007).
 */
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(limit?: number): Promise<User[]> {
    const boundedLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.users.findAll(boundedLimit);
  }
}
