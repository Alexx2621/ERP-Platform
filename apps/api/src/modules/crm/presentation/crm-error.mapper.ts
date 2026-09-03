import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  ActivityAlreadyCompletedError,
  ActivityMustRelateToExactlyOneError,
  ActivityNotFoundError,
  CompanyContextRequiredError,
  CustomerNotFoundError,
  LeadAlreadyTerminalError,
  LeadNotFoundError,
  OpportunityNotFoundError,
  OpportunityNotOpenError,
  PipelineCodeAlreadyInUseError,
  PipelineNotFoundError,
  PipelineStageNotFoundError,
} from "../application/errors";

export function handleCrmError(error: unknown): never {
  if (error instanceof CompanyContextRequiredError) {
    throw new AppException("COMPANY_CONTEXT_REQUIRED", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof LeadNotFoundError) {
    throw new AppException("LEAD_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof LeadAlreadyTerminalError) {
    throw new AppException("LEAD_ALREADY_TERMINAL", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PipelineNotFoundError) {
    throw new AppException("PIPELINE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PipelineCodeAlreadyInUseError) {
    throw new AppException("PIPELINE_CODE_IN_USE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof PipelineStageNotFoundError) {
    throw new AppException("PIPELINE_STAGE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof OpportunityNotFoundError) {
    throw new AppException("OPPORTUNITY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof OpportunityNotOpenError) {
    throw new AppException("OPPORTUNITY_NOT_OPEN", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ActivityNotFoundError) {
    throw new AppException("ACTIVITY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof ActivityAlreadyCompletedError) {
    throw new AppException("ACTIVITY_ALREADY_COMPLETED", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof ActivityMustRelateToExactlyOneError) {
    throw new AppException("ACTIVITY_MUST_RELATE_TO_EXACTLY_ONE", error.message, HttpStatus.BAD_REQUEST);
  }
  if (error instanceof CustomerNotFoundError) {
    throw new AppException("CUSTOMER_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  throw error;
}
