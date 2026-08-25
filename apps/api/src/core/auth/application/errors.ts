export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountDisabledError extends Error {
  constructor() {
    super("This account has been disabled.");
    this.name = "AccountDisabledError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session not found.");
    this.name = "SessionNotFoundError";
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Session has expired.");
    this.name = "SessionExpiredError";
  }
}

export class SessionRevokedError extends Error {
  constructor() {
    super("Session has been revoked.");
    this.name = "SessionRevokedError";
  }
}
