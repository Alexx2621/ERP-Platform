import { ApiError } from "./api-client";

const FRIENDLY_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "El correo o la contraseña no son correctos.",
  EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con este correo.",
  TENANT_SLUG_ALREADY_EXISTS: "Ese identificador de espacio ya está en uso.",
  RATE_LIMIT_EXCEEDED: "Demasiados intentos. Espera un momento antes de continuar.",
  UNAUTHORIZED: "Tu sesión ya no es válida. Inicia sesión nuevamente.",
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY_ERRORS[error.code] ?? error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
