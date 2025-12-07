import { api } from "./client";
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from "@/lib/types";

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return api.post("api/auth/login", { json: credentials }).json<AuthResponse>();
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  return api.post("api/auth/register", { json: credentials }).json<AuthResponse>();
}

export async function getMe(): Promise<User> {
  return api.get("api/auth/me").json<User>();
}
