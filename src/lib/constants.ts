import { env } from "./env";

export const API_BASE_URL = env.API_BASE_URL;

export const ROUTE_NAMES = {
  LOGIN: "Login",
  SETTINGS: "Settings",
  HOME: "Home",
  PROFILE: "Profile",
  MANAGE_DATABASE: "ManageDatabase",
  INTROSPECTION: "Introspection",
} as const;
