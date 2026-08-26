import { ApiClient } from "@erp/api-client";

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
});
