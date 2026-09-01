import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  CustomerNotFoundError,
  InsufficientInventoryForOrderError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  QuoteHasNoLinesError,
  QuoteNotDraftError,
  QuoteNotFoundError,
  SalesOrderHasNoLinesError,
  SalesOrderLineNotFoundError,
  SalesOrderNotCancellableError,
  SalesOrderNotConfirmedError,
  SalesOrderNotDraftError,
  SalesOrderNotFoundError,
  SalesOrderNotFulfilledError,
  SalesReturnExceedsFulfilledQuantityError,
  SalesReturnHasNoLinesError,
  SalesReturnNotFoundError,
  TaxNotFoundError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../application/errors";

export function handleSalesError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
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
  if (error instanceof WarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof TaxNotFoundError) {
    throw new AppException("TAX_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof QuoteNotFoundError) {
    throw new AppException("QUOTE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof QuoteNotDraftError) {
    throw new AppException("QUOTE_NOT_DRAFT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof QuoteHasNoLinesError) {
    throw new AppException("QUOTE_HAS_NO_LINES", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesOrderNotFoundError) {
    throw new AppException("SALES_ORDER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof SalesOrderNotDraftError) {
    throw new AppException("SALES_ORDER_NOT_DRAFT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesOrderNotConfirmedError) {
    throw new AppException("SALES_ORDER_NOT_CONFIRMED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesOrderNotCancellableError) {
    throw new AppException("SALES_ORDER_NOT_CANCELLABLE", error.message, HttpStatus.CONFLICT);
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
  if (error instanceof SalesReturnNotFoundError) {
    throw new AppException("SALES_RETURN_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof SalesReturnExceedsFulfilledQuantityError) {
    throw new AppException("SALES_RETURN_EXCEEDS_FULFILLED_QUANTITY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SalesReturnHasNoLinesError) {
    throw new AppException("SALES_RETURN_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
