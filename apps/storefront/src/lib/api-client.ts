import { ApiClient } from "@erp/api-client";
import { getApiBaseUrl } from "./env";

/**
 * Single shared client for the whole app — every public storefront
 * endpoint (catalog, cart, checkout, orders) is unauthenticated, so there
 * is no per-request/session state to keep separate between callers.
 */
export const apiClient = new ApiClient({ baseUrl: getApiBaseUrl() });
