import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { User } from "../domain/user.entity";
import { normalizeEmail } from "../domain/normalize-email";
import { USER_REPOSITORY, UserRepository } from "../domain/user.repository";
import { EmailAlreadyInUseError } from "./errors";

export interface CreateUserInput {
  email: string;
  displayName: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyInUseError(email);
    }

    const now = new Date();
    const user = User.create({
      id: newId(),
      email,
      displayName: input.displayName.trim(),
      status: "ACTIVE",
      // Never accepted as input — platform admin is granted out-of-band
      // (docs/DECISIONS.md ADR-007), never via public registration.
      isPlatformAdmin: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.users.save(user);
    return user;
  }
}
