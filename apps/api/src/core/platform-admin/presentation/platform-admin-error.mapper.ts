import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { UserNotFoundError } from "../../users";

export function handlePlatformAdminError(error: unknown): never {
  if (error instanceof UserNotFoundError) {
    throw new AppException("USER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  throw error;
}
