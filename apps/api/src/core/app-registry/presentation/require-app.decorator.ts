import { SetMetadata } from "@nestjs/common";

export const APP_METADATA_KEY = "app-registry:app";

/**
 * Declares the app key `AppEnablementGuard` must find enabled for the
 * caller's tenant. Applied at the controller-class level throughout this
 * codebase's business modules — every route in a controller belongs to the
 * same app — so the guard reads it via `Reflector.getAllAndOverride` across
 * both handler and class, not `RequirePermission`'s handler-only lookup.
 */
export const RequireApp = (appKey: string) => SetMetadata(APP_METADATA_KEY, appKey);
