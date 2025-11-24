export interface Database {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  db_type: "postgres";
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  params: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSearchParams {
  search_word?: string;
  source_id?: string;
  schema?: string;
  table_name?: string;
  page?: number;
  per_page?: number;
}

export interface DatabaseSearchResponse {
  data: Database[];
  page: number;
  per_page: number;
  total_pages: number;
  total_rows: number;
}

export interface Schemas {
  id: string;
  sources_id: string;
  schema: string;
  created_at: string;
}

export interface Tables {
  id: string;
  sources_id: string;
  schema: string;
  table_name: string;
  created_at: string;
}

export interface Columns {
  id: string;
  sources_id: string;
  schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
  ordinal_position: number;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface UpdateDatabaseRequest {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  db_type: string;
  host: string;
  port: number;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  username: string;
  password?: string;
  database_name: string;
  params?: string;
  is_update_password: boolean;
}

export interface CreateDatabaseRequest {
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  db_type: string;
  host: string;
  port: number;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  username: string;
  password: string;
  database_name: string;
  params?: string;
}
