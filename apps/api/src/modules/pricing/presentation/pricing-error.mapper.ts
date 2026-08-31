import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  CompanyContextRequiredError,
  PriceListCodeAlreadyInUseError,
  PriceListItemAlreadyExistsError,
  PriceListItemNotFoundError,
  PriceListItemProductHasVariantsError,
  PriceListItemProductNotFoundError,
  PriceListNotFoundError,
} from "../application/errors";

export function handlePricingError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PriceListNotFoundError) {
    throw new AppException("PRICE_LIST_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PriceListCodeAlreadyInUseError) {
    throw new AppException("PRICE_LIST_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PriceListItemNotFoundError) {
    throw new AppException("PRICE_LIST_ITEM_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PriceListItemProductNotFoundError) {
    throw new AppException("PRICE_LIST_ITEM_PRODUCT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof PriceListItemProductHasVariantsError) {
    throw new AppException("PRICE_LIST_ITEM_PRODUCT_HAS_VARIANTS", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PriceListItemAlreadyExistsError) {
    throw new AppException("PRICE_LIST_ITEM_ALREADY_EXISTS", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
