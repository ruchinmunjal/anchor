import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";

const TOKEN_KEY = "access_token";

// Standalone token functions for use by API client (avoids circular deps)
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function hasAccessToken(): boolean {
  return !!getAccessToken();
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      setAuth: (user, token) => {
        setAccessToken(token);
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      },
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      logout: () => {
        clearAccessToken();
        set({ ...initialState, isInitialized: true });
      },
      reset: () => {
        clearAccessToken();
        set(initialState);
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
