import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import type { AuthTokens, OAuth2CallbackRequest } from "@/types/auth";
import {
  getAuthUrl,
  exchangeAuthCode,
  getSession,
  logout as apiLogout,
  setTokens,
} from "./api";

export const useAuthStore = defineStore("auth", () => {
  const tokens = ref<AuthTokens | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const sessionChecked = ref(false);

  const isAuthenticated = computed(() => tokens.value !== null);
  const user = computed(() => tokens.value?.user_info || null);
  const accessToken = computed(() => tokens.value?.access_token || null);

  const clearError = () => {
    error.value = null;
  };

  const setAuthTokens = (authTokens: AuthTokens | null) => {
    tokens.value = authTokens;
    setTokens(authTokens);
  };

  /**
   * Initiate OAuth2 login flow
   */
  const initiateLogin = async () => {
    try {
      loading.value = true;
      clearError();

      const response = await getAuthUrl();

      window.location.href = response.auth_url;
    } catch (err: any) {
      error.value = err.message || "Failed to initiate login";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Handle OAuth2 callback with code and state
   */
  const handleCallback = async (code: string, state: string) => {
    try {
      loading.value = true;
      clearError();

      const request: OAuth2CallbackRequest = { code, state };
      const authTokens = await exchangeAuthCode(request);

      setAuthTokens(authTokens);
      sessionChecked.value = true;
      return authTokens;
    } catch (err: any) {
      error.value = err.message || "Failed to complete login";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check current session
   */
  const checkSession = async () => {
    if (loading.value || (sessionChecked.value && tokens.value)) {
      return tokens.value;
    }

    try {
      loading.value = true;
      clearError();

      const sessionData = await getSession();
      setAuthTokens(sessionData);
      sessionChecked.value = true;
      return sessionData;
    } catch (err: any) {
      setAuthTokens(null);
      sessionChecked.value = true;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Initialize auth state (check session on app start)
   */
  const initialize = async () => {
    try {
      await checkSession();
    } catch (err) {}
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      loading.value = true;

      await apiLogout();

      setAuthTokens(null);
      sessionChecked.value = false;
    } catch (err: any) {
      error.value = err.message || "Failed to logout";

      setAuthTokens(null);
      sessionChecked.value = false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (resourceName: string): boolean => {
    if (!user.value?.permissions) return false;

    return user.value.permissions.some(
      (permission) => permission.resource_name === resourceName
    );
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (roleName: string): boolean => {
    if (!user.value?.roles) return false;

    return user.value.roles.includes(roleName);
  };

  return {
    tokens: readonly(tokens),
    loading: readonly(loading),
    error: readonly(error),

    isAuthenticated,
    user,
    accessToken,

    clearError,
    initiateLogin,
    handleCallback,
    checkSession,
    initialize,
    logout,
    hasPermission,
    hasRole,
  };
});
