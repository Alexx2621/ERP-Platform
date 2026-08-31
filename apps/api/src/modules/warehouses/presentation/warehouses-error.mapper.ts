import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  WarehouseCodeAlreadyInUseError,
  WarehouseNotFoundError,
} from "../application/errors";

export function handleWarehouseError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof WarehouseCodeAlreadyInUseError) {
    throw new AppException("WAREHOUSE_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
