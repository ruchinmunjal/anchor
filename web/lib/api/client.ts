import ky, { HTTPError } from "ky";
import { getAccessToken, clearAccessToken } from "@/features/auth";

// Create the API client with interceptors
export const api = ky.create({
  prefixUrl: "/",
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    beforeError: [
      async (error) => {
        // Extract error message from API response body
        if (error instanceof HTTPError) {
          try {
            const errorBody = (await error.response.json()) as {
              message?: string | string[];
            };
            // Handle both string messages and array of validation errors
            if (errorBody.message) {
              if (Array.isArray(errorBody.message)) {
                error.message = errorBody.message.join(", ");
              } else {
                error.message = errorBody.message;
              }
            }
          } catch {
            // If we can't parse the error body, keep the original message
          }
        }
        return error;
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Handle 401 errors - clear token and let the auth guard handle redirect
        if (response.status === 401) {
          clearAccessToken();
          // Dispatch custom event for auth state listeners
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
          }
        }
        return response;
      },
    ],
  },
});
