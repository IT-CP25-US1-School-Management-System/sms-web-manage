export interface Roles {
  id: string;
  name: string;
  description: string;
  service: string;
  scopes: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolesSearchParams {
  search_word?: string;
  page?: number;
  per_page?: number;
}

export interface RolesSearchResponse {
  data: Roles[];
  page: number;
  per_page: number;
  total_pages: number;
  total_rows: number;
}

export interface CreateRolesRequest {
  name: string;
  description: string;
  service: string;
  scopes: string[];
  is_default: boolean;
}

export interface UpdateRolesRequest {
  description: string;
  service: string;
  scopes: string[];
  is_default?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  id: string;
  message?: string;
  data?: T;
}
