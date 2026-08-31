import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  InsufficientInventoryError,
  InventoryReservationNotActiveError,
  InventoryReservationNotFoundError,
  InventoryTransferNotFoundError,
  InventoryTransferNotInTransitError,
  ProductInventoryNotTrackedError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  SameWarehouseTransferError,
  WarehouseNotFoundError,
} from "../application/errors";

export function handleInventoryError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof WarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductNotFoundError) {
    throw new AppException("PRODUCT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductInventoryNotTrackedError) {
    throw new AppException("PRODUCT_INVENTORY_NOT_TRACKED", error.message, HttpStatus.CONFLICT);
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
  if (error instanceof SameWarehouseTransferError) {
    throw new AppException("SAME_WAREHOUSE_TRANSFER", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof InsufficientInventoryError) {
    throw new AppException("INSUFFICIENT_INVENTORY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof InventoryTransferNotFoundError) {
    throw new AppException("INVENTORY_TRANSFER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof InventoryTransferNotInTransitError) {
    throw new AppException("INVENTORY_TRANSFER_NOT_IN_TRANSIT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof InventoryReservationNotFoundError) {
    throw new AppException("INVENTORY_RESERVATION_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof InventoryReservationNotActiveError) {
    throw new AppException("INVENTORY_RESERVATION_NOT_ACTIVE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
