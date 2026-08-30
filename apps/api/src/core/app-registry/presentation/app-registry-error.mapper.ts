import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  AppDependencyNotSatisfiedError,
  AppHasActiveDependentsError,
  AppNotEnabledError,
  AppNotFoundError,
} from "../application/errors";

export function handleAppRegistryError(error: unknown): never {
  if (error instanceof AppNotFoundError) {
    throw new AppException("APP_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof AppDependencyNotSatisfiedError) {
    throw new AppException("APP_DEPENDENCY_NOT_SATISFIED", error.message, HttpStatus.CONFLICT, {
      missingKeys: error.missingKeys,
    });
  }
  if (error instanceof AppHasActiveDependentsError) {
    throw new AppException("APP_HAS_ACTIVE_DEPENDENTS", error.message, HttpStatus.CONFLICT, {
      dependentKeys: error.dependentKeys,
    });
  }
  if (error instanceof AppNotEnabledError) {
    throw new AppException("APP_NOT_ENABLED", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
