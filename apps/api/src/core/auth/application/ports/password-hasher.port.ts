/** Port over the password hashing algorithm (ADR-006: Argon2id). Domain/application never call argon2 directly. */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(encodedHash: string, plainPassword: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");
