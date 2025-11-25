import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type {
  AuthorizeResponse,
  AuthTokens,
  OAuth2CallbackRequest,
  SessionResponse,
} from "@/types/auth";
import router from "@/router";
import { ROUTE_NAMES } from "@/lib/constants";

const AUTH_BASE_URL = import.meta.env.VITE_API_BASE_URL_AUTH;
const DATA_BASE_URL = import.meta.env.VITE_API_BASE_URL_DATA;

if (!AUTH_BASE_URL || !DATA_BASE_URL) {
  throw new Error(
    "Missing required environment variables: VITE_API_BASE_URL_AUTH and VITE_API_BASE_URL_DATA must be defined"
  );
}

let currentTokens: AuthTokens | null = null;

/**
 * Set authentication tokens for API calls
 */
export function setTokens(tokens: AuthTokens | null) {
  currentTokens = tokens;

  if (tokens) {
    dataApiInstance.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${tokens.access_token}`;
  } else {
    delete dataApiInstance.defaults.headers.common["Authorization"];
  }
}

/**
 * Get current authentication tokens
 */
export function getTokens(): AuthTokens | null {
  return currentTokens;
}

export const authApiInstance: AxiosInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const dataApiInstance: AxiosInstance = axios.create({
  baseURL: DATA_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

authApiInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error("AUTH API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

dataApiInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("401 detected, attempting to refresh session...");
        const sessionResponse = await authApiInstance.get<SessionResponse>(
          "/v1/auth/session"
        );
        const sessionData = sessionResponse.data;

        setTokens(sessionData);

        originalRequest.headers[
          "Authorization"
        ] = `Bearer ${sessionData.access_token}`;

        return dataApiInstance(originalRequest);
      } catch (refreshError) {
        console.error("Session refresh failed:", refreshError);
        setTokens(null);
        router.push({ name: ROUTE_NAMES.LOGIN });
        return Promise.reject(
          new Error("Session expired. Please login again.")
        );
      }
    }

    console.error("DATA API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Get authorization URL from OAuth2 provider
 */
export async function getAuthUrl(): Promise<AuthorizeResponse> {
  const response = await authApiInstance.post<AuthorizeResponse>(
    "/v1/oauth2/login"
  );
  return response.data;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAuthCode(
  request: OAuth2CallbackRequest
): Promise<AuthTokens> {
  const response = await authApiInstance.post<AuthTokens>(
    "/v1/oauth2/callback",
    request
  );
  const tokens = response.data;

  setTokens(tokens);
  return tokens;
}

/**
 * Get current session information
 */
export async function getSession(): Promise<SessionResponse> {
  const response = await authApiInstance.get<SessionResponse>(
    "/v1/auth/session"
  );
  const session = response.data;

  setTokens(session);
  return session;
}

/**
 * Logout from OAuth2 provider
 */
export async function logoutFromServer(): Promise<void> {
  try {
    await authApiInstance.post("/v1/oauth2/logout");
  } catch (error) {
    console.error("Logout API error:", error);
  }
}

/**
 * Logout user (clear tokens and call logout API)
 */
export async function logout(): Promise<void> {
  await logoutFromServer();
  setTokens(null);
  router.push({ name: ROUTE_NAMES.LOGIN });
}
