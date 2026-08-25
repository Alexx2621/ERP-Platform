import { User } from "./user.entity";

/**
 * Port for User persistence. No "unscoped" query variants are exposed because
 * User is a global identity (see class docstring on User) — callers that need
 * tenant-scoped access must go through Membership, owned by the Access Control module.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(normalizedEmail: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
