import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { UserNotFoundError } from "../../users";
import {
  InvalidSettingValueError,
  ScopeNotAllowedForSettingError,
  SettingDefinitionNotFoundError,
} from "../../configuration";

export function handlePlatformAdminError(error: unknown): never {
  if (error instanceof UserNotFoundError) {
    throw new AppException("USER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof SettingDefinitionNotFoundError) {
    throw new AppException("SETTING_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ScopeNotAllowedForSettingError) {
    throw new AppException("SETTING_SCOPE_NOT_ALLOWED", error.message, HttpStatus.BAD_REQUEST, {
      scopeType: error.scopeType,
    });
  }
  if (error instanceof InvalidSettingValueError) {
    throw new AppException("INVALID_SETTING_VALUE", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
