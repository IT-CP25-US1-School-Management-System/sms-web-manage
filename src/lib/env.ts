export const env = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL_AUTH || "http://localhost:3000",
  API_BASE_URL_DATA:
    import.meta.env.VITE_API_BASE_URL_DATA || "http://localhost:3000",
  APP_NAME: import.meta.env.VITE_APP_NAME || "Management System",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "1.0.0",
  APP_MODE: import.meta.env.VITE_APP_MODE || "development",
};

export const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key];
  if (value === undefined && fallback === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return String(value || fallback || "");
};

export const isProduction = (): boolean => {
  return env.APP_MODE === "production";
};
