import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  PosPaymentFailedError,
  PosRegisterCodeAlreadyInUseError,
  PosRegisterHasOpenShiftError,
  PosRegisterNotActiveError,
  PosRegisterNotFoundError,
  PosReturnAlreadyRefundedError,
  PosReturnHasNoLinesError,
  PosSaleAmountTenderedTooLowError,
  PosSaleHasNoLinesError,
  PosSaleNotFoundError,
  PosShiftNotFoundError,
  PosShiftNotOpenError,
  WarehouseNotFoundError,
} from "../application/errors";
import {
  CustomerNotFoundError,
  InsufficientInventoryForOrderError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  SalesOrderHasNoLinesError,
  SalesOrderLineNotFoundError,
  SalesOrderNotFulfilledError,
  SalesReturnExceedsFulfilledQuantityError,
  TaxNotFoundError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError as SalesWarehouseNotFoundError,
  WarehouseRequiredError,
} from "../../sales";
import {
  PaymentCurrencyMismatchError,
  PaymentNotCapturedError,
  PaymentRefundFailedError,
  PaymentSalesOrderNotFoundError,
} from "../../payments";

/**
 * POS's own errors plus the realistically-reachable subset of Sales'/
 * Payments' own errors that `RingUpSaleUseCase`/`CreatePosReturnUseCase`
 * can propagate as-is (they call those modules' use cases directly through
 * their public contracts, docs/ARCHITECTURE.md §6) — mapped to the exact
 * same `AppException` codes those modules' own mappers already use, so a
 * `PRODUCT_NOT_FOUND` means the same thing everywhere in this API
 * regardless of which module raised it.
 */
export function handlePosError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseNotFoundError || error instanceof SalesWarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PosRegisterNotFoundError) {
    throw new AppException("POS_REGISTER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PosRegisterCodeAlreadyInUseError) {
    throw new AppException("POS_REGISTER_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PosRegisterNotActiveError) {
    throw new AppException("POS_REGISTER_NOT_ACTIVE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PosRegisterHasOpenShiftError) {
    throw new AppException("POS_REGISTER_HAS_OPEN_SHIFT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PosShiftNotFoundError) {
    throw new AppException("POS_SHIFT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PosShiftNotOpenError) {
    throw new AppException("POS_SHIFT_NOT_OPEN", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PosSaleHasNoLinesError) {
    throw new AppException("POS_SALE_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PosSaleNotFoundError) {
    throw new AppException("POS_SALE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PosSaleAmountTenderedTooLowError) {
    throw new AppException("POS_SALE_AMOUNT_TENDERED_TOO_LOW", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PosPaymentFailedError) {
    throw new AppException("POS_PAYMENT_FAILED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PosReturnHasNoLinesError) {
    throw new AppException("POS_RETURN_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PosReturnAlreadyRefundedError) {
    throw new AppException("POS_RETURN_ALREADY_REFUNDED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CustomerNotFoundError) {
    throw new AppException("CUSTOMER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductNotFoundError) {
    throw new AppException("PRODUCT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductVariantRequiredError) {
    throw new AppException("PRODUCT_VARIANT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductVariantNotAllowedError) {
    throw new AppException("PRODUCT_VARIANT_NOT_ALLOWED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductVariantNotFoundError) {
    throw new AppException("PRODUCT_VARIANT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseRequiredError) {
    throw new AppException("WAREHOUSE_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseNotAllowedError) {
    throw new AppException("WAREHOUSE_NOT_ALLOWED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof TaxNotFoundError) {
    throw new AppException("TAX_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof SalesOrderHasNoLinesError) {
    throw new AppException("SALES_ORDER_HAS_NO_LINES", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof InsufficientInventoryForOrderError) {
    throw new AppException("INSUFFICIENT_INVENTORY_FOR_ORDER", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesOrderNotFulfilledError) {
    throw new AppException("SALES_ORDER_NOT_FULFILLED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesOrderLineNotFoundError) {
    throw new AppException("SALES_ORDER_LINE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof SalesReturnExceedsFulfilledQuantityError) {
    throw new AppException("SALES_RETURN_EXCEEDS_FULFILLED_QUANTITY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PaymentCurrencyMismatchError) {
    throw new AppException("PAYMENT_CURRENCY_MISMATCH", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentSalesOrderNotFoundError) {
    throw new AppException("PAYMENT_SALES_ORDER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentNotCapturedError) {
    throw new AppException("PAYMENT_NOT_CAPTURED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PaymentRefundFailedError) {
    throw new AppException("PAYMENT_REFUND_FAILED", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
