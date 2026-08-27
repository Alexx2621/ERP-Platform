import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  CompanyNotFoundInTenantError,
  InvalidSettingValueError,
  ScopeNotAllowedForSettingError,
  SettingDefinitionNotFoundError,
} from "../application/errors";

export function handleConfigurationError(error: unknown): never {
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
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof CompanyNotFoundInTenantError) {
    throw new AppException("COMPANY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  throw error;
}
