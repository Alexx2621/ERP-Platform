/**
 * Public contract of the Users module. Other modules (e.g. Auth) must only
 * import from here, never from users/domain|application|infrastructure directly
 * (docs/ARCHITECTURE.md §6: "module A -> public contract of module B").
 */
export { User, type UserStatus, type UserProps } from "./domain/user.entity";
export { USER_REPOSITORY, type UserRepository } from "./domain/user.repository";
export { normalizeEmail } from "./domain/normalize-email";
export { CreateUserUseCase, type CreateUserInput } from "./application/create-user.use-case";
export { SetUserStatusUseCase, type SetUserStatusInput } from "./application/set-user-status.use-case";
export { ListUsersUseCase } from "./application/list-users.use-case";
export { EmailAlreadyInUseError, UserNotFoundError } from "./application/errors";
export { UsersModule } from "./users.module";
