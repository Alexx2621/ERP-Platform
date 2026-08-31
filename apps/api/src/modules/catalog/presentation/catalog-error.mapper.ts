import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  BrandCodeAlreadyInUseError,
  BrandNotFoundError,
  CategoryCodeAlreadyInUseError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CompanyContextRequiredError,
  ProductBarcodeAlreadyInUseError,
  ProductBrandNotFoundError,
  ProductCategoryNotFoundError,
  ProductCodeAlreadyInUseError,
  ProductDoesNotSupportVariantsError,
  ProductNotFoundError,
  ProductUnitOfMeasureNotFoundError,
  ProductVariantNotFoundError,
  ProductVariantSkuAlreadyInUseError,
  UnitOfMeasureCodeAlreadyInUseError,
  UnitOfMeasureNotFoundError,
} from "../application/errors";

export function handleCatalogError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof UnitOfMeasureNotFoundError) {
    throw new AppException("UNIT_OF_MEASURE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof UnitOfMeasureCodeAlreadyInUseError) {
    throw new AppException("UNIT_OF_MEASURE_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CategoryNotFoundError) {
    throw new AppException("CATEGORY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof CategoryCodeAlreadyInUseError) {
    throw new AppException("CATEGORY_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof CategoryParentNotFoundError) {
    throw new AppException("CATEGORY_PARENT_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof BrandNotFoundError) {
    throw new AppException("BRAND_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof BrandCodeAlreadyInUseError) {
    throw new AppException("BRAND_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductNotFoundError) {
    throw new AppException("PRODUCT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ProductCodeAlreadyInUseError) {
    throw new AppException("PRODUCT_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductBarcodeAlreadyInUseError) {
    throw new AppException("PRODUCT_BARCODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductUnitOfMeasureNotFoundError) {
    throw new AppException("PRODUCT_UNIT_OF_MEASURE_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductCategoryNotFoundError) {
    throw new AppException("PRODUCT_CATEGORY_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductBrandNotFoundError) {
    throw new AppException("PRODUCT_BRAND_NOT_FOUND", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof ProductDoesNotSupportVariantsError) {
    throw new AppException("PRODUCT_DOES_NOT_SUPPORT_VARIANTS", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ProductVariantNotFoundError) {
    throw new AppException("PRODUCT_VARIANT_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ProductVariantSkuAlreadyInUseError) {
    throw new AppException("PRODUCT_VARIANT_SKU_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  throw error;
}
