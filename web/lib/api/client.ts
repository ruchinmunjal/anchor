import ky from "ky";
import { getAccessToken, clearAccessToken } from "@/features/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Create the API client with interceptors
export const api = ky.create({
  prefixUrl: API_URL,
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
