export class EmailAlreadyInUseError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`);
    this.name = "EmailAlreadyInUseError";
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User "${id}" was not found.`);
    this.name = "UserNotFoundError";
  }
}
