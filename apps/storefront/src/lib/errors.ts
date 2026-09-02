import { ApiError } from "@erp/api-client";

/**
 * Every ApiError message is already a real, sanitized, human-readable
 * message produced by the backend — safe to show directly to the shopper.
 * A generic fallback only covers the case of a genuinely unexpected,
 * non-ApiError throw (a programming bug, not a backend response).
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Ocurrió un error inesperado. Intenta de nuevo en unos momentos.";
}
