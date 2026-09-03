import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  BillOfMaterialCodeAlreadyInUseError,
  BillOfMaterialHasNoComponentsError,
  BillOfMaterialNotActiveError,
  BillOfMaterialNotFoundError,
  ComponentCannotBeFinishedGoodError,
  CompanyContextRequiredError,
  ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError,
  ProductionOrderHasActivityError,
  ProductionOrderMaterialIssueExceedsRequiredQuantityError,
  ProductionOrderMaterialNotFoundError,
  ProductionOrderMaterialReturnExceedsIssuedQuantityError,
  ProductionOrderNotCancellableError,
  ProductionOrderNotConfirmedError,
  ProductionOrderNotDraftError,
  ProductionOrderNotFoundError,
  ProductionOrderNotOpenError,
  ProductionOrderOperationNotFoundError,
  ProductNotFoundError,
  ProductNotInventoryTrackedError,
  ProductVariantNotAllowedError,
  ProductVariantNotFoundError,
  ProductVariantRequiredError,
  WarehouseNotFoundError,
} from "../application/errors";

export function handleManufacturingError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductNotFoundError) {
    throw new AppException("PRODUCT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductNotInventoryTrackedError) {
    throw new AppException("PRODUCT_NOT_INVENTORY_TRACKED", error.message, HttpStatus.BAD_REQUEST);
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
  if (error instanceof ComponentCannotBeFinishedGoodError) {
    throw new AppException("COMPONENT_CANNOT_BE_FINISHED_GOOD", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof BillOfMaterialHasNoComponentsError) {
    throw new AppException("BILL_OF_MATERIAL_HAS_NO_COMPONENTS", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof BillOfMaterialCodeAlreadyInUseError) {
    throw new AppException("BILL_OF_MATERIAL_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof WarehouseNotFoundError) {
    throw new AppException("WAREHOUSE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof BillOfMaterialNotFoundError) {
    throw new AppException("BILL_OF_MATERIAL_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof BillOfMaterialNotActiveError) {
    throw new AppException("BILL_OF_MATERIAL_NOT_ACTIVE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderNotFoundError) {
    throw new AppException("PRODUCTION_ORDER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ProductionOrderNotDraftError) {
    throw new AppException("PRODUCTION_ORDER_NOT_DRAFT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderNotConfirmedError) {
    throw new AppException("PRODUCTION_ORDER_NOT_CONFIRMED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderNotOpenError) {
    throw new AppException("PRODUCTION_ORDER_NOT_OPEN", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderNotCancellableError) {
    throw new AppException("PRODUCTION_ORDER_NOT_CANCELLABLE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderHasActivityError) {
    throw new AppException("PRODUCTION_ORDER_HAS_ACTIVITY", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductionOrderMaterialNotFoundError) {
    throw new AppException("PRODUCTION_ORDER_MATERIAL_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductionOrderMaterialIssueExceedsRequiredQuantityError) {
    throw new AppException(
      "PRODUCTION_ORDER_MATERIAL_ISSUE_EXCEEDS_REQUIRED_QUANTITY",
      error.message,
      HttpStatus.CONFLICT,
    );
  }
  if (error instanceof ProductionOrderMaterialReturnExceedsIssuedQuantityError) {
    throw new AppException(
      "PRODUCTION_ORDER_MATERIAL_RETURN_EXCEEDS_ISSUED_QUANTITY",
      error.message,
      HttpStatus.CONFLICT,
    );
  }
  if (error instanceof ProductionOrderOperationNotFoundError) {
    throw new AppException("PRODUCTION_ORDER_OPERATION_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError) {
    throw new AppException(
      "PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_EXCEEDS_PLANNED_QUANTITY",
      error.message,
      HttpStatus.CONFLICT,
    );
  }
  throw error;
}
