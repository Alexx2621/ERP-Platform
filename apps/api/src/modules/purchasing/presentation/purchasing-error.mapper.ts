import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  ProductNotFoundError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  PurchaseOrderHasNoLinesError,
  PurchaseOrderHasReceiptsError,
  PurchaseOrderLineNotFoundError,
  PurchaseOrderNotCancellableError,
  PurchaseOrderNotConfirmedError,
  PurchaseOrderNotDraftError,
  PurchaseOrderNotFoundError,
  PurchaseReceiptExceedsOrderedQuantityError,
  PurchaseReceiptHasNoLinesError,
  PurchaseReceiptNotFoundError,
  PurchaseReturnExceedsReceivedQuantityError,
  PurchaseReturnHasNoLinesError,
  PurchaseReturnNotFoundError,
  SupplierInvoiceNotFoundError,
  SupplierInvoiceNotRecordedError,
  SupplierInvoiceOrderMismatchError,
  SupplierNotFoundError,
  WarehouseNotAllowedError,
  WarehouseNotFoundError,
  WarehouseRequiredError,
} from "../application/errors";

export function handlePurchasingError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof SupplierNotFoundError) {
    throw new AppException("SUPPLIER_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
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
  if (error instanceof PurchaseOrderNotFoundError) {
    throw new AppException("PURCHASE_ORDER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PurchaseOrderNotDraftError) {
    throw new AppException("PURCHASE_ORDER_NOT_DRAFT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseOrderNotConfirmedError) {
    throw new AppException("PURCHASE_ORDER_NOT_CONFIRMED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseOrderNotCancellableError) {
    throw new AppException("PURCHASE_ORDER_NOT_CANCELLABLE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseOrderHasNoLinesError) {
    throw new AppException("PURCHASE_ORDER_HAS_NO_LINES", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseOrderHasReceiptsError) {
    throw new AppException("PURCHASE_ORDER_HAS_RECEIPTS", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseOrderLineNotFoundError) {
    throw new AppException("PURCHASE_ORDER_LINE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PurchaseReceiptNotFoundError) {
    throw new AppException("PURCHASE_RECEIPT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PurchaseReceiptHasNoLinesError) {
    throw new AppException("PURCHASE_RECEIPT_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PurchaseReceiptExceedsOrderedQuantityError) {
    throw new AppException("PURCHASE_RECEIPT_EXCEEDS_ORDERED_QUANTITY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PurchaseReturnNotFoundError) {
    throw new AppException("PURCHASE_RETURN_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PurchaseReturnHasNoLinesError) {
    throw new AppException("PURCHASE_RETURN_HAS_NO_LINES", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PurchaseReturnExceedsReceivedQuantityError) {
    throw new AppException("PURCHASE_RETURN_EXCEEDS_RECEIVED_QUANTITY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SupplierInvoiceNotFoundError) {
    throw new AppException("SUPPLIER_INVOICE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof SupplierInvoiceNotRecordedError) {
    throw new AppException("SUPPLIER_INVOICE_NOT_RECORDED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof SupplierInvoiceOrderMismatchError) {
    throw new AppException("SUPPLIER_INVOICE_ORDER_MISMATCH", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
