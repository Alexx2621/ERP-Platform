import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Base for all domain/application errors that must reach the client as the
 * standardized error envelope from docs/MASTER_SPEC.md §61 (statusCode, code,
 * message, details, correlationId). Never expose raw internal errors instead.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, statusCode);
  }
}
