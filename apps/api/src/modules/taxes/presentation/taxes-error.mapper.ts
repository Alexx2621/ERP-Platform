import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { CompanyContextRequiredError, TaxCodeAlreadyInUseError, TaxNotFoundError } from "../application/errors";

export function handleTaxError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof TaxNotFoundError) {
    throw new AppException("TAX_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof TaxCodeAlreadyInUseError) {
    throw new AppException("TAX_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
