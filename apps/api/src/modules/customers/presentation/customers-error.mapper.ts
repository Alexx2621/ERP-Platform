import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  CustomerCodeAlreadyInUseError,
  CustomerNotFoundError,
  CustomerTaxIdAlreadyInUseError,
} from "../application/errors";

export function handleCustomerError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof CustomerNotFoundError) {
    throw new AppException("CUSTOMER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof CustomerCodeAlreadyInUseError) {
    throw new AppException("CUSTOMER_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CustomerTaxIdAlreadyInUseError) {
    throw new AppException("CUSTOMER_TAX_ID_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
