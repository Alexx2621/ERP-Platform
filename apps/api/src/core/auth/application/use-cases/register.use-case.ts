import { Injectable } from "@nestjs/common";
import { CreateUserUseCase } from "../../../users";
import { LoginUseCase } from "./login.use-case";
import { SetPasswordUseCase } from "./set-password.use-case";
import { AuthenticatedSession } from "../authenticated-session.result";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Orchestrates "create account" (MASTER_SPEC §68): CreateUserUseCase (Users)
 * + SetPasswordUseCase + LoginUseCase (both Auth), so a new account is
 * usable immediately instead of requiring a separate login round-trip.
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly setPassword: SetPasswordUseCase,
    private readonly login: LoginUseCase,
  ) {}

  async execute(input: RegisterInput): Promise<AuthenticatedSession> {
    const user = await this.createUser.execute({
      email: input.email,
      displayName: input.displayName,
    });
    await this.setPassword.execute(user.id, input.password);
    return this.login.execute({
      email: input.email,
      password: input.password,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }
}
