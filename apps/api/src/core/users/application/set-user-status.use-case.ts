import { Inject, Injectable } from "@nestjs/common";
import { User, UserStatus } from "../domain/user.entity";
import { USER_REPOSITORY, UserRepository } from "../domain/user.repository";
import { UserNotFoundError } from "./errors";

@Injectable()
export class SetUserStatusUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string, status: UserStatus): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (status === "DISABLED") {
      user.disable();
    } else {
      user.enable();
    }

    await this.users.save(user);
    return user;
  }
}
