export interface Dataset {
  id: string;
  name: string;
  description: string;
  domain: string;
  tags: string[];
  has_pii: boolean;
  owner: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface DatasetDetail extends Dataset {
  schema?: any;
  sample_data?: any;
  metadata?: Record<string, any>;
}

export interface DatasetUpsert {
  name: string;
  description: string;
  domain?: string;
  tags?: string[];
  has_pii?: boolean;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface DatasetSearchParams {
  search_word?: string;
  domain?: string;
  tag?: string;
  has_pii?: boolean;
  owner?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DatasetSearchResponse {
  data: Dataset[];
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