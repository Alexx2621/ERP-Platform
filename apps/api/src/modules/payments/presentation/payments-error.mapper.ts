import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  PaymentCurrencyMismatchError,
  PaymentNotCapturedError,
  PaymentNotFoundError,
  PaymentRefundFailedError,
  PaymentSalesOrderNotFoundError,
} from "../application/errors";

export function handlePaymentsError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentSalesOrderNotFoundError) {
    throw new AppException("PAYMENT_SALES_ORDER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentCurrencyMismatchError) {
    throw new AppException("PAYMENT_CURRENCY_MISMATCH", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentNotFoundError) {
    throw new AppException("PAYMENT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PaymentNotCapturedError) {
    throw new AppException("PAYMENT_NOT_CAPTURED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PaymentRefundFailedError) {
    throw new AppException("PAYMENT_REFUND_FAILED", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
