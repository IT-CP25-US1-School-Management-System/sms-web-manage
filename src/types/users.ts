import type { Roles } from "./roles";

export interface Users {
  keycloak_id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: Roles[];
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsersSearchParams {
  search_word?: string;
  page?: number;
  per_page?: number;
}

export interface UsersSearchResponse {
  data: Users[];
  page: number;
  per_page: number;
  total_pages: number;
  total_rows: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
