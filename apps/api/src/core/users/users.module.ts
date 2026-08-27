import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { USER_REPOSITORY } from "./domain/user.repository";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository";
import { CreateUserUseCase } from "./application/create-user.use-case";
import { SetUserStatusUseCase } from "./application/set-user-status.use-case";

@Module({
  imports: [AuditModule],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    CreateUserUseCase,
    SetUserStatusUseCase,
  ],
  exports: [USER_REPOSITORY, CreateUserUseCase, SetUserStatusUseCase],
})
export class UsersModule {}
