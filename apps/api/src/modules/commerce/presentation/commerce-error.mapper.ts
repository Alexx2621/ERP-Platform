import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CartHasNoLinesError,
  CartLineNotFoundError,
  CartNotFoundError,
  CartNotOpenError,
  CheckoutPaymentFailedError,
  CommerceOrderNotFoundError,
  CompanyContextRequiredError,
  GuestEmailRequiredError,
  ProductVariantNotAllowedError as CommerceProductVariantNotAllowedError,
  ProductVariantRequiredError as CommerceProductVariantRequiredError,
  StorefrontCodeAlreadyInUseError,
  StorefrontNotActiveError,
  StorefrontNotFoundError,
  StorefrontProductNotFoundError,
  StorefrontWarehouseNotConfiguredError,
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
  WarehouseNotAllowedError,
  WarehouseNotFoundError as SalesWarehouseNotFoundError,
  WarehouseRequiredError,
} from "../../sales";
import { PaymentCurrencyMismatchError, PaymentSalesOrderNotFoundError } from "../../payments";
import { CustomerCodeAlreadyInUseError } from "../../customers";

/**
 * Commerce's own errors plus the realistically-reachable subset of Sales'/
 * Payments'/Catalog's/Customers' own errors that `CheckoutUseCase`/
 * `AddCartLineUseCase` can propagate as-is (they call those modules'
 * public contracts directly, docs/ARCHITECTURE.md §6) — mapped to the exact
 * same `AppException` codes those modules' own mappers already use, the
 * same convention `handlePosError` already established.
 */
export function handleCommerceError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseNotFoundError || error instanceof SalesWarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof StorefrontNotFoundError) {
    throw new AppException("STOREFRONT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof StorefrontCodeAlreadyInUseError) {
    throw new AppException("STOREFRONT_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof StorefrontNotActiveError) {
    throw new AppException("STOREFRONT_NOT_ACTIVE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof StorefrontProductNotFoundError) {
    throw new AppException("STOREFRONT_PRODUCT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof StorefrontWarehouseNotConfiguredError) {
    throw new AppException("STOREFRONT_WAREHOUSE_NOT_CONFIGURED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CartNotFoundError) {
    throw new AppException("CART_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof CartNotOpenError) {
    throw new AppException("CART_NOT_OPEN", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CartLineNotFoundError) {
    throw new AppException("CART_LINE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof CartHasNoLinesError) {
    throw new AppException("CART_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof GuestEmailRequiredError) {
    throw new AppException("GUEST_EMAIL_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof CommerceOrderNotFoundError) {
    throw new AppException("COMMERCE_ORDER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof CheckoutPaymentFailedError) {
    throw new AppException("CHECKOUT_PAYMENT_FAILED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CustomerCodeAlreadyInUseError) {
    throw new AppException("CUSTOMER_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CustomerNotFoundError) {
    throw new AppException("CUSTOMER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductNotFoundError) {
    throw new AppException("PRODUCT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductVariantRequiredError || error instanceof CommerceProductVariantRequiredError) {
    throw new AppException("PRODUCT_VARIANT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductVariantNotAllowedError || error instanceof CommerceProductVariantNotAllowedError) {
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
  if (error instanceof SalesOrderHasNoLinesError) {
    throw new AppException("SALES_ORDER_HAS_NO_LINES", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof InsufficientInventoryForOrderError) {
    throw new AppException("INSUFFICIENT_INVENTORY_FOR_ORDER", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PaymentCurrencyMismatchError) {
    throw new AppException("PAYMENT_CURRENCY_MISMATCH", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PaymentSalesOrderNotFoundError) {
    throw new AppException("PAYMENT_SALES_ORDER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
