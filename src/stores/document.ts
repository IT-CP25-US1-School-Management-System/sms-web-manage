import { dataApiInstance } from './api';
import type {
  // File/Resource
  FileResponse,
  FileWithMetadataResponse,
  ResourceListResponse,
  ResourceSearchParams,
  SearchResourcesRequest,
  SearchResourcesResponse,
  CreateResourceParams,
  UpdateResourceRequest,
  UploadParams,
  // Path
  PathResponse,
  CreatePathRequest,
  UpdatePathRequest,
  // Folder
  FolderResponse,
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderSearchParams,
  // Common
  SingleDataResponse,
  MessageResponse,
} from '@/types/document';

const DOCUMENT_BASE_URL = import.meta.env.VITE_API_BASE_URL_DOCUMENT;

if (!DOCUMENT_BASE_URL) {
  console.warn(
    'VITE_API_BASE_URL_DOCUMENT is not defined. Document service will use data API base URL.'
  );
}

// Use document base URL if available, otherwise fall back to data API
const getBaseUrl = () => DOCUMENT_BASE_URL || '';

// =====================
// Document Upload & Resource APIs
// =====================

/**
 * Upload a file with auto-creation of path/folder if not exists
 */
export async function uploadDocument(
  file: File,
  params: UploadParams
): Promise<FileResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('params', JSON.stringify(params));

  const response = await dataApiInstance.post<SingleDataResponse<FileResponse>>(
    `${getBaseUrl()}/v1/documents/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data;
}

/**
 * Create a resource with metadata (path/folder must exist)
 */
export async function createResource(
  file: File,
  params: CreateResourceParams
): Promise<FileWithMetadataResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('params', JSON.stringify(params));

  const response = await dataApiInstance.post<SingleDataResponse<FileWithMetadataResponse>>(
    `${getBaseUrl()}/v1/documents/resource`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data;
}

/**
 * List all resources with optional filtering
 */
export async function listResources(
  params?: ResourceSearchParams
): Promise<ResourceListResponse> {
  const response = await dataApiInstance.get<ResourceListResponse>(
    `${getBaseUrl()}/v1/documents/resource`,
    { params }
  );

  return response.data;
}

/**
 * Search resources across all paths/folders
 */
export async function searchResources(
  params?: SearchResourcesRequest
): Promise<SearchResourcesResponse> {
  const response = await dataApiInstance.get<SearchResourcesResponse>(
    `${getBaseUrl()}/v1/documents/search`,
    { params }
  );

  return response.data;
}

/**
 * Get resource by ID
 */
export async function getResourceById(resourceId: string): Promise<FileResponse> {
  const response = await dataApiInstance.get<SingleDataResponse<FileResponse>>(
    `${getBaseUrl()}/v1/documents/resource/${resourceId}`
  );

  return response.data.data;
}

/**
 * Update resource metadata
 */
export async function updateResource(
  resourceId: string,
  data: UpdateResourceRequest
): Promise<{ resource_id: string; metadata: any }> {
  const response = await dataApiInstance.put<SingleDataResponse<{ resource_id: string; metadata: any }>>(
    `${getBaseUrl()}/v1/documents/resource/${resourceId}`,
    data
  );

  return response.data.data;
}

/**
 * Delete resource
 */
export async function deleteResource(resourceId: string): Promise<string> {
  const response = await dataApiInstance.delete<MessageResponse>(
    `${getBaseUrl()}/v1/documents/resource/${resourceId}`
  );

  return response.data.data.message;
}

// =====================
// Path Management APIs
// =====================

/**
 * Create a new path (bucket configuration)
 */
export async function createPath(data: CreatePathRequest): Promise<PathResponse> {
  const response = await dataApiInstance.post<SingleDataResponse<PathResponse>>(
    `${getBaseUrl()}/v1/documents/path`,
    data
  );

  return response.data.data;
}

/**
 * List all paths
 */
export async function listPaths(): Promise<PathResponse[]> {
  const response = await dataApiInstance.get<SingleDataResponse<PathResponse[]>>(
    `${getBaseUrl()}/v1/documents/path`
  );

  return response.data.data;
}

/**
 * Get path by ID
 */
export async function getPathById(pathId: string): Promise<PathResponse> {
  const response = await dataApiInstance.get<SingleDataResponse<PathResponse>>(
    `${getBaseUrl()}/v1/documents/path/${pathId}`
  );

  return response.data.data;
}

/**
 * Update path
 */
export async function updatePath(
  pathId: string,
  data: UpdatePathRequest
): Promise<PathResponse> {
  const response = await dataApiInstance.put<SingleDataResponse<PathResponse>>(
    `${getBaseUrl()}/v1/documents/path/${pathId}`,
    data
  );

  return response.data.data;
}

/**
 * Delete path (must not have any folders)
 */
export async function deletePath(pathId: string): Promise<string> {
  const response = await dataApiInstance.delete<MessageResponse>(
    `${getBaseUrl()}/v1/documents/path/${pathId}`
  );
  // Handle different response structures
  if (response.data?.data?.message) {
    return response.data.data.message;
  }
  return 'Deleted successfully';
}

// =====================
// Folder Management APIs
// =====================

/**
 * Create a new folder within a path
 */
export async function createFolder(data: CreateFolderRequest): Promise<FolderResponse> {
  const response = await dataApiInstance.post<SingleDataResponse<FolderResponse>>(
    `${getBaseUrl()}/v1/documents/folder`,
    data
  );

  return response.data.data;
}

/**
 * List all folders (optionally filtered by path_id)
 */
export async function listFolders(params?: FolderSearchParams): Promise<FolderResponse[]> {
  const response = await dataApiInstance.get<SingleDataResponse<FolderResponse[]>>(
    `${getBaseUrl()}/v1/documents/folder`,
    { params }
  );

  return response.data.data;
}

/**
 * Get folder by ID
 */
export async function getFolderById(folderId: string): Promise<FolderResponse> {
  const response = await dataApiInstance.get<SingleDataResponse<FolderResponse>>(
    `${getBaseUrl()}/v1/documents/folder/${folderId}`
  );

  return response.data.data;
}

/**
 * Update folder
 */
export async function updateFolder(
  folderId: string,
  data: UpdateFolderRequest
): Promise<FolderResponse> {
  const response = await dataApiInstance.put<SingleDataResponse<FolderResponse>>(
    `${getBaseUrl()}/v1/documents/folder/${folderId}`,
    data
  );

  return response.data.data;
}

/**
 * Delete folder (must not have any resources)
 */
export async function deleteFolder(folderId: string): Promise<string> {
  const response = await dataApiInstance.delete<MessageResponse>(
    `${getBaseUrl()}/v1/documents/folder/${folderId}`
  );

  // Handle different response structures
  if (response.data?.data?.message) {
    return response.data.data.message;
  }
  return 'Deleted successfully';
}

// =====================
// Helper Functions
// =====================

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on content type
 */
export function getFileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'spreadsheet';
  if (contentType.includes('document') || contentType.includes('word')) return 'document';
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'presentation';
  if (contentType.includes('zip') || contentType.includes('compressed')) return 'archive';
  return 'file';
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options?: {
    maxSizeMB?: number;
    allowedMimeTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedMimeTypes } = options || {};

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `ไฟล์มีขนาดเกิน ${maxSizeMB} MB`,
    };
  }

  // Check mime type if specified
  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    const isAllowed = allowedMimeTypes.some((type) => {
      if (type.endsWith('/*')) {
        // Check category (e.g., image/*)
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `ประเภทไฟล์ไม่ได้รับอนุญาต (${file.type})`,
      };
    }
  }

  return { valid: true };
}
