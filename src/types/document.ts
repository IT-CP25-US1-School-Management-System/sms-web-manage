// =====================
// Enums
// =====================

export const DOCUMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

// =====================
// Base Interfaces
// =====================

export interface MetadataInfo {
  id: string;
  status: DocumentStatus;
  uploaded_by: string;
  description?: string;
  tags?: string[];
  created_at: string;
}

export interface PathFolderInfo {
  path_exists: boolean;
  folder_exists: boolean;
  path_name: string;
  folder_name: string;
}

// =====================
// File/Resource Responses
// =====================

export interface FileResponse {
  resource_id: string;
  url: string;
  original_filename: string;
  storage_filename: string;
  object_name?: string;
  content_type: string;
  extension?: string;
  size: number;
  created_at?: string;
  metadata?: MetadataInfo;
  folder?: {
    id: string;
    folder: string;
    path?: {
      id: string;
      name: string;
      bucket_name: string;
    };
  };
}

export interface FileWithMetadataResponse extends FileResponse {
  metadata: MetadataInfo;
  path_info: PathFolderInfo;
}

export interface ResourceListItem {
  resource_id: string;
  original_filename: string;
  storage_filename: string;
  content_type: string;
  size: number;
  created_at: string;
  metadata?: MetadataInfo;
  folder?: {
    id: string;
    folder: string;
    path?: {
      id: string;
      name: string;
      bucket_name: string;
    };
  };
}

// =====================
// Path Interfaces
// =====================

export interface PathResponse {
  id: string;
  name: string;
  description?: string;
  bucket_name: string;
  mime_type?: string;
  maximum_size_mb?: number;
  is_generate_filename?: boolean;
  roles?: string[];
  created_at?: string;
  folders?: FolderResponse[];
}

export interface CreatePathRequest {
  name: string;
  bucket_name: string;
  description?: string;
  mime_type?: string;
  maximum_size_mb?: number;
  is_generate_filename?: boolean;
  roles?: string[];
}

export interface UpdatePathRequest {
  name?: string;
  description?: string;
  mime_type?: string;
  maximum_size_mb?: number;
  is_generate_filename?: boolean;
  roles?: string[];
}

// =====================
// Folder Interfaces
// =====================

export interface FolderResponse {
  id: string;
  path_id: string;
  folder: string;
  created_at?: string;
  path?: {
    id: string;
    name: string;
    bucket_name: string;
  };
}

export interface CreateFolderRequest {
  path_id: string;
  folder: string;
}

export interface UpdateFolderRequest {
  folder: string;
}

// =====================
// Upload Interfaces
// =====================

export interface UploadParams {
  path: string;
  folder: string;
}

export interface CreateResourceParams extends UploadParams {
  uploaded_by: string;
  description?: string;
  tag_ids?: string[];
}

export interface UpdateResourceRequest {
  description?: string;
  status?: DocumentStatus;
  tag_ids?: string[];
}

// =====================
// Query Params
// =====================

export interface ResourceSearchParams {
  folder_id?: string;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
}

export interface SearchResourcesRequest {
  q?: string;
  path_id?: string;
  folder_id?: string;
  status?: DocumentStatus;
  uploaded_by?: string;
  mime_type?: string;
  tag_ids?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "size" | "filename";
  sort_order?: "asc" | "desc";
}

export interface SearchHighlight {
  field: string;
  matched: string;
}

export interface SearchQueryInfo {
  q: string;
  filters_applied: string[];
}

export interface SearchResourceItem {
  resource_id: string;
  original_filename: string;
  storage_filename: string;
  content_type: string;
  size: number;
  created_at: string;
  metadata?: MetadataInfo;
  folder?: {
    id: string;
    folder: string;
    path?: {
      id: string;
      name: string;
      bucket_name: string;
    };
  };
  highlight?: SearchHighlight;
}

export interface SearchResourcesResponse {
  data: SearchResourceItem[];
  page: number;
  per_page: number;
  total_rows: number;
  total_pages: number;
  query?: SearchQueryInfo;
}

export interface FolderSearchParams {
  path_id?: string;
}

// =====================
// API Responses
// =====================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ResourceListResponse {
  data: ResourceListItem[];
  pagination: PaginationInfo;
}

export interface SingleDataResponse<T> {
  data: T;
}

export interface MessageResponse {
  data: {
    message: string;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    code: number;
  };
}

export interface PathExistenceError {
  error: string;
  path_info: PathFolderInfo;
}
