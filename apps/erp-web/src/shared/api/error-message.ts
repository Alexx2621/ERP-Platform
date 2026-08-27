import { ApiError } from "@erp/api-client";

const FRIENDLY_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "El correo o la contraseña no son correctos.",
  EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con este correo.",
  TENANT_SLUG_ALREADY_EXISTS: "Ese identificador de espacio ya está en uso.",
  RATE_LIMIT_EXCEEDED: "Demasiados intentos. Espera un momento antes de continuar.",
  UNAUTHORIZED: "Tu sesión ya no es válida. Inicia sesión nuevamente.",
  PERMISSION_DENIED: "No tienes permiso para realizar esta acción.",
  ROLE_NAME_IN_USE: "Ya existe un rol con ese nombre en este tenant.",
  UNKNOWN_PERMISSION_KEYS: "Uno o más permisos ya no existen en el catálogo.",
  ROLE_NOT_FOUND: "El rol ya no existe en este tenant.",
  MEMBERSHIP_NOT_FOUND: "La membresía no existe en este tenant.",
  ROLE_ASSIGNMENT_DUPLICATE: "Esta membresía ya tiene el rol en ese alcance.",
  SETTING_NOT_FOUND: "El ajuste ya no existe en el catálogo.",
  SETTING_SCOPE_NOT_ALLOWED: "Este ajuste no admite el alcance seleccionado.",
  INVALID_SETTING_VALUE: "El valor no coincide con el tipo definido para este ajuste.",
  COMPANY_CONTEXT_REQUIRED: "Selecciona una empresa para guardar el ajuste en ese alcance.",
  COMPANY_NOT_FOUND: "La empresa no existe dentro del tenant activo.",
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY_ERRORS[error.code] ?? error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
