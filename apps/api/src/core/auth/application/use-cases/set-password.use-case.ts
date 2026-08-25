import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { USER_REPOSITORY, UserNotFoundError, UserRepository } from "../../../users";
import { Credential } from "../../domain/credential.entity";
import { CREDENTIAL_REPOSITORY, CredentialRepository } from "../../domain/credential.repository";
import { PASSWORD_HASHER, PasswordHasher } from "../ports/password-hasher.port";

/** Creates a user's first credential, or replaces the existing one (e.g. after a password reset). */
@Injectable()
export class SetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CREDENTIAL_REPOSITORY) private readonly credentials: CredentialRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(userId: string, plainPassword: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const passwordHash = await this.hasher.hash(plainPassword);
    const existing = await this.credentials.findByUserId(userId);

    if (existing) {
      existing.changePasswordHash(passwordHash);
      await this.credentials.save(existing);
      return;
    }

    const now = new Date();
    const credential = Credential.create({
      id: newId(),
      userId,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    await this.credentials.save(credential);
  }
}
