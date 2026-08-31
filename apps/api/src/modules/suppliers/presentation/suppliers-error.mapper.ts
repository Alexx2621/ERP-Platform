import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  SupplierCodeAlreadyInUseError,
  SupplierNotFoundError,
  SupplierTaxIdAlreadyInUseError,
} from "../application/errors";

export function handleSupplierError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof SupplierNotFoundError) {
    throw new AppException("SUPPLIER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof SupplierCodeAlreadyInUseError) {
    throw new AppException("SUPPLIER_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SupplierTaxIdAlreadyInUseError) {
    throw new AppException("SUPPLIER_TAX_ID_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
