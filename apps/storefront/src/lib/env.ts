/**
 * Read at call time (never cached in a module-level constant computed at
 * import time) so a production build never hard-fails just because these
 * `NEXT_PUBLIC_*` variables aren't populated in the environment the build
 * runs in — the real values are supplied at deploy/runtime, and every
 * caller here still gets a sane local-dev default either way.
 */

const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";
const DEFAULT_STOREFRONT_CODE = "main-store";

/** Base URL of the Commerce Engine REST API, including the /api/v1 prefix. */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

/**
 * Public `code` of the single Storefront this deployment serves. There is
 * no hostname-routing/multi-tenant layer in this platform yet — one
 * deployment serves exactly one storefront, selected by this env var.
 */
export function getStorefrontCode(): string {
  return process.env.NEXT_PUBLIC_STOREFRONT_CODE ?? DEFAULT_STOREFRONT_CODE;
}
