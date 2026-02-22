import { APP_CONFIG } from "../config.js";
import { createHttpApi } from "./httpApi.js";
import { createMockApi } from "./mockApi.js";

export function createApiClient() {
  if (APP_CONFIG.apiMode === "http") {
    return createHttpApi(APP_CONFIG.apiBaseUrl);
  }
  return createMockApi();
}
