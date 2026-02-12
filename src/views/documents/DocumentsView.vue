<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useToast } from "@/composables/useToast";
import { useRouter, useRoute } from "vue-router";
import { ROUTE_NAMES } from "@/lib/constants";

import MainLayout from "@/layouts/MainLayout.vue";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Search,
  Loader2,
  AlertCircle,
  Upload,
  FileText,
  Image,
  Video,
  Music,
  FileArchive,
  File,
  MoreHorizontal,
  Trash2,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  HardDrive,
  ChevronRight,
  Settings,
  Eye,
} from "lucide-vue-next";

import type {
  PathResponse,
  FolderResponse,
  ResourceListItem,
} from "@/types/document";
import {
  listPaths,
  listFolders,
  listResources,
  createResource,
  deletePath,
  deleteFolder,
  deleteResource,
  getResourceById,
  validateFile,
  formatFileSize,
} from "@/stores/document";

import DocumentUploadModal from "./DocumentUploadModal.vue";
import PathCreateModal from "./PathCreateModal.vue";
import PathEditModal from "./PathEditModal.vue";
import FolderCreateModal from "./FolderCreateModal.vue";

const router = useRouter();
const route = useRoute();
const { showError, showSuccess } = useToast();

// Navigation state
type BrowseLevel = "paths" | "folders" | "resources";
const currentLevel = ref<BrowseLevel>("paths");
const currentPath = ref<PathResponse | null>(null);
const currentFolder = ref<FolderResponse | null>(null);

// Data
const paths = ref<PathResponse[]>([]);
const folders = ref<FolderResponse[]>([]);
const resources = ref<ResourceListItem[]>([]);

// UI State
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const searchQuery = ref("");
const isResourceDragOver = ref(false);
const isQuickUploading = ref(false);
const quickUploadProgress = ref(0);

// Pagination
const pageSize = 10;
const currentPages = ref<Record<BrowseLevel, number>>({
  paths: 1,
  folders: 1,
  resources: 1,
});

// Dialogs
const showUploadDialog = ref(false);
const showPathCreateDialog = ref(false);
const showPathEditDialog = ref(false);
const showFolderCreateDialog = ref(false);
const showDeleteDialog = ref(false);

// Delete state
const deleteType = ref<"path" | "folder" | "resource">("path");
const itemToDelete = ref<PathResponse | FolderResponse | ResourceListItem | null>(null);
const isDeleting = ref(false);

// Edit state
const pathToEdit = ref<PathResponse | null>(null);

// Computed
const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  
  if (currentLevel.value === "paths") {
    if (!query) return paths.value;
    return paths.value.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.bucket_name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }
  
  if (currentLevel.value === "folders") {
    if (!query) return folders.value;
    return folders.value.filter((f) =>
      f.folder.toLowerCase().includes(query)
    );
  }
  
  if (currentLevel.value === "resources") {
    if (!query) return resources.value;
    return resources.value.filter(
      (r) =>
        r.original_filename.toLowerCase().includes(query) ||
        r.content_type.toLowerCase().includes(query)
    );
  }
  
  return [];
});

const pageTitle = computed(() => {
  if (currentLevel.value === "paths") return "จัดการเอกสาร (Paths)";
  if (currentLevel.value === "folders") return currentPath.value?.name || "Folders";
  if (currentLevel.value === "resources") return currentFolder.value?.folder || "Files";
  return "Documents";
});

const pageDescription = computed(() => {
  if (currentLevel.value === "paths") return "เลือก Path เพื่อดูไฟล์";
  if (currentLevel.value === "folders") return `Path: ${currentPath.value?.bucket_name}`;
  if (currentLevel.value === "resources")
    return `${currentPath.value?.name} / ${currentFolder.value?.folder}`;
  return "";
});

const currentPage = computed({
  get: () => currentPages.value[currentLevel.value],
  set: (value: number) => {
    currentPages.value[currentLevel.value] = value;
  },
});

const totalItems = computed(() => filteredItems.value.length);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalItems.value / pageSize));
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredItems.value.slice(start, end);
});

const pageStart = computed(() => {
  if (totalItems.value === 0) return 0;
  return (currentPage.value - 1) * pageSize + 1;
});

const pageEnd = computed(() => {
  return Math.min(currentPage.value * pageSize, totalItems.value);
});

const canGoPrevPage = computed(() => currentPage.value > 1);
const canGoNextPage = computed(() => currentPage.value < totalPages.value);

const goPrevPage = () => {
  if (!canGoPrevPage.value) return;
  currentPage.value -= 1;
};

const goNextPage = () => {
  if (!canGoNextPage.value) return;
  currentPage.value += 1;
};

// File icon helper
const getFileIcon = (contentType: string) => {
  if (contentType.startsWith("image/")) return Image;
  if (contentType.startsWith("video/")) return Video;
  if (contentType.startsWith("audio/")) return Music;
  if (contentType.includes("zip") || contentType.includes("compressed"))
    return FileArchive;
  if (contentType === "application/pdf") return FileText;
  return File;
};

// Get file extension from filename
const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop()?.toUpperCase() || "FILE";
  }
  return "FILE";
};

// Navigation
const goToRoot = () => {
  currentLevel.value = "paths";
  currentPath.value = null;
  currentFolder.value = null;
  searchQuery.value = "";
  loadPaths();
};

const goToPath = (path: PathResponse) => {
  currentLevel.value = "folders";
  currentPath.value = path;
  currentFolder.value = null;
  searchQuery.value = "";
  loadFolders(path.id);
};

const goToFolder = (folder: FolderResponse) => {
  currentLevel.value = "resources";
  currentFolder.value = folder;
  searchQuery.value = "";
  loadResources(folder.id);
};

// Load functions
const loadPaths = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    paths.value = await listPaths();
  } catch (error: any) {
    console.error("Error loading paths:", error);
    const message = error.response?.data?.error?.message || "ไม่สามารถโหลดข้อมูล Paths ได้";
    errorMessage.value = message;
    showError(message);
  } finally {
    isLoading.value = false;
  }
};

const loadFolders = async (pathId: string) => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    const allFolders = await listFolders();
    folders.value = allFolders.filter((f) => f.path_id === pathId);
  } catch (error: any) {
    console.error("Error loading folders:", error);
    const message = error.response?.data?.error?.message || "ไม่สามารถโหลดข้อมูล Folders ได้";
    errorMessage.value = message;
    showError(message);
  } finally {
    isLoading.value = false;
  }
};

const loadResources = async (folderId: string) => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    const response = await listResources({ folder_id: folderId, limit: 100 });
    resources.value = response.data;
  } catch (error: any) {
    console.error("Error loading resources:", error);
    const message = error.response?.data?.error?.message || "ไม่สามารถโหลดข้อมูลไฟล์ได้";
    errorMessage.value = message;
    showError(message);
  } finally {
    isLoading.value = false;
  }
};

const refresh = () => {
  if (currentLevel.value === "paths") {
    loadPaths();
  } else if (currentLevel.value === "folders" && currentPath.value) {
    loadFolders(currentPath.value.id);
  } else if (currentLevel.value === "resources" && currentFolder.value) {
    loadResources(currentFolder.value.id);
  }
};

// Actions
const openUploadDialog = () => {
  showUploadDialog.value = true;
};

const validateFileForCurrentPath = (file: File) => {
  const maxSize = currentPath.value?.maximum_size_mb || 10;
  const allowedTypes = currentPath.value?.mime_type
    ?.split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  return validateFile(file, {
    maxSizeMB: maxSize,
    allowedMimeTypes: allowedTypes,
  });
};

const quickUploadFiles = async (files: File[]) => {
  if (!currentPath.value || !currentFolder.value || files.length === 0) return;

  isQuickUploading.value = true;
  quickUploadProgress.value = 0;

  try {
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (!file) continue;
      const validation = validateFileForCurrentPath(file);

      if (!validation.valid) {
        showError(`${file.name}: ${validation.error || "ไฟล์ไม่ถูกต้อง"}`);
        continue;
      }

      await createResource(file, {
        path: currentPath.value.name,
        folder: currentFolder.value.folder,
        uploaded_by: "current-user",
      });

      uploadedCount += 1;
      quickUploadProgress.value = Math.round(((i + 1) / files.length) * 100);
    }

    if (uploadedCount > 0) {
      showSuccess(`อัปโหลดสำเร็จ ${uploadedCount} ไฟล์`);
      await loadResources(currentFolder.value.id);
    }
  } catch (error: any) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      "ไม่สามารถอัปโหลดไฟล์ได้";
    showError(message);
  } finally {
    isQuickUploading.value = false;
    quickUploadProgress.value = 0;
    isResourceDragOver.value = false;
  }
};

const handleResourceDragOver = (event: DragEvent) => {
  if (currentLevel.value !== "resources" || isQuickUploading.value) return;
  event.preventDefault();
  isResourceDragOver.value = true;
};

const handleResourceDragLeave = (event: DragEvent) => {
  if (currentLevel.value !== "resources") return;
  const related = event.relatedTarget as Node | null;
  const current = event.currentTarget as Node | null;
  if (current && related && current.contains(related)) return;
  isResourceDragOver.value = false;
};

const handleResourceDrop = async (event: DragEvent) => {
  if (currentLevel.value !== "resources" || isQuickUploading.value) return;
  event.preventDefault();
  isResourceDragOver.value = false;

  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  if (droppedFiles.length === 0) return;

  await quickUploadFiles(droppedFiles);
};

const handleUploadSuccess = () => {
  showUploadDialog.value = false;
  showSuccess("อัปโหลดไฟล์สำเร็จ");
  if (currentFolder.value) {
    loadResources(currentFolder.value.id);
  }
};

const openPathCreate = () => {
  showPathCreateDialog.value = true;
};

const handlePathCreateSuccess = () => {
  showPathCreateDialog.value = false;
  showSuccess("สร้าง Path สำเร็จ");
  loadPaths();
};

const openPathEdit = (path: PathResponse) => {
  pathToEdit.value = path;
  showPathEditDialog.value = true;
};

const handlePathEditSuccess = () => {
  showPathEditDialog.value = false;
  pathToEdit.value = null;
  showSuccess("อัปเดต Path สำเร็จ");
  loadPaths();
};

const openFolderCreate = () => {
  showFolderCreateDialog.value = true;
};

const handleFolderCreateSuccess = () => {
  showFolderCreateDialog.value = false;
  showSuccess("สร้าง Folder สำเร็จ");
  if (currentPath.value) {
    loadFolders(currentPath.value.id);
  }
};

// Delete
const confirmDelete = (
  type: "path" | "folder" | "resource",
  item: PathResponse | FolderResponse | ResourceListItem
) => {
  deleteType.value = type;
  itemToDelete.value = item;
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value) return;
  
  isDeleting.value = true;
  
  try {
    if (deleteType.value === "path") {
      await deletePath((itemToDelete.value as PathResponse).id);
      showSuccess("ลบ Path สำเร็จ");
      loadPaths();
    } else if (deleteType.value === "folder") {
      await deleteFolder((itemToDelete.value as FolderResponse).id);
      showSuccess("ลบ Folder สำเร็จ");
      if (currentPath.value) {
        loadFolders(currentPath.value.id);
      }
    } else if (deleteType.value === "resource") {
      await deleteResource((itemToDelete.value as ResourceListItem).resource_id);
      showSuccess("ลบไฟล์สำเร็จ");
      if (currentFolder.value) {
        loadResources(currentFolder.value.id);
      }
    }
    
    showDeleteDialog.value = false;
    itemToDelete.value = null;
  } catch (error: any) {
    const message = error.response?.data?.error?.message || "ไม่สามารถลบได้";
    showError(message);
  } finally {
    isDeleting.value = false;
  }
};

const getDeleteItemName = () => {
  if (!itemToDelete.value) return "";
  if (deleteType.value === "path") return (itemToDelete.value as PathResponse).name;
  if (deleteType.value === "folder") return (itemToDelete.value as FolderResponse).folder;
  if (deleteType.value === "resource")
    return (itemToDelete.value as ResourceListItem).original_filename;
  return "";
};

// Resource actions
const downloadResource = async (resource: ResourceListItem) => {
  try {
    const result = await getResourceById(resource.resource_id);
    window.open(result.url, "_blank");
  } catch (error: any) {
    showError("ไม่สามารถดาวน์โหลดไฟล์ได้");
  }
};

const viewResourceDetail = (resource: ResourceListItem) => {
  router.push({
    name: ROUTE_NAMES.DOCUMENTS_DETAIL,
    params: { resourceId: resource.resource_id },
    query: {
      pathId: currentPath.value?.id,
      folderId: currentFolder.value?.id,
      pathName: currentPath.value?.name,
      folderName: currentFolder.value?.folder,
      fileName: resource.original_filename,
    },
  });
};

// Lifecycle
const restoreFromRouteQuery = async () => {
  const queryPathId =
    typeof route.query.pathId === "string" ? route.query.pathId : "";
  const queryFolderId =
    typeof route.query.folderId === "string" ? route.query.folderId : "";

  await loadPaths();

  if (!queryPathId) return;

  const matchedPath = paths.value.find((p) => p.id === queryPathId);
  if (!matchedPath) return;

  currentLevel.value = "folders";
  currentPath.value = matchedPath;
  await loadFolders(matchedPath.id);

  if (!queryFolderId) return;

  const matchedFolder = folders.value.find((f) => f.id === queryFolderId);
  if (!matchedFolder) return;

  currentLevel.value = "resources";
  currentFolder.value = matchedFolder;
  await loadResources(matchedFolder.id);
};

onMounted(() => {
  restoreFromRouteQuery();
});

watch(
  () => currentLevel.value,
  () => {
    currentPages.value[currentLevel.value] = 1;
  }
);

watch(
  () => searchQuery.value,
  () => {
    currentPages.value[currentLevel.value] = 1;
  }
);

watch(
  () => filteredItems.value.length,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    }
  }
);
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-4 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ pageTitle }}</h1>
          <p class="text-muted-foreground mt-1">{{ pageDescription }}</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="icon" @click="refresh" :disabled="isLoading">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
          
          <!-- Create buttons based on level -->
          <Button
            v-if="currentLevel === 'paths'"
            variant="outline"
            @click="router.push({ name: ROUTE_NAMES.DOCUMENTS_SEARCH })"
            class="flex items-center gap-2"
          >
            <Search class="h-4 w-4" />
            ค้นหาไฟล์ทั้งหมด
          </Button>

          <Button
            v-if="currentLevel === 'paths'"
            @click="openPathCreate"
            class="flex items-center gap-2"
          >
            <Plus class="h-4 w-4" />
            สร้าง Path
          </Button>
          
          <Button
            v-if="currentLevel === 'folders'"
            @click="openFolderCreate"
            class="flex items-center gap-2"
          >
            <Plus class="h-4 w-4" />
            สร้าง Folder
          </Button>
          
          <Button
            v-if="currentLevel === 'resources'"
            @click="openUploadDialog"
            class="flex items-center gap-2"
          >
            <Upload class="h-4 w-4" />
            อัปโหลดไฟล์
          </Button>
        </div>
      </div>

      <!-- Breadcrumb Navigation -->
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              as="button"
              @click="goToRoot"
              class="flex items-center gap-1 hover:text-foreground"
              :class="{ 'text-foreground font-medium': currentLevel === 'paths' }"
            >
              <HardDrive class="h-4 w-4" />
              Paths
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <template v-if="currentPath">
            <BreadcrumbSeparator>
              <ChevronRight class="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink
                v-if="currentLevel === 'resources'"
                as="button"
                @click="goToPath(currentPath)"
                class="flex items-center gap-1 hover:text-foreground"
              >
                <FolderOpen class="h-4 w-4" />
                {{ currentPath.name }}
              </BreadcrumbLink>
              <BreadcrumbPage v-else class="flex items-center gap-1">
                <FolderOpen class="h-4 w-4" />
                {{ currentPath.name }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </template>
          
          <template v-if="currentFolder">
            <BreadcrumbSeparator>
              <ChevronRight class="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage class="flex items-center gap-1">
                <FolderOpen class="h-4 w-4" />
                {{ currentFolder.folder }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </template>
        </BreadcrumbList>
      </Breadcrumb>

      <!-- Search -->
      <Card>
        <div class="p-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              :placeholder="
                currentLevel === 'paths'
                  ? 'ค้นหา Path...'
                  : currentLevel === 'folders'
                  ? 'ค้นหา Folder...'
                  : 'ค้นหาไฟล์...'
              "
              class="pl-10"
            />
          </div>
        </div>
      </Card>

      <!-- Content -->
      <Card
        :class="{
          'ring-2 ring-primary ring-offset-2 transition-all':
            currentLevel === 'resources' && isResourceDragOver,
        }"
        @dragover="handleResourceDragOver"
        @dragleave="handleResourceDragLeave"
        @drop="handleResourceDrop"
      >
        <CardContent class="p-0">
          <div
            v-if="currentLevel === 'resources'"
            class="border-b px-4 py-2 text-sm"
            :class="
              isResourceDragOver
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/30 text-muted-foreground'
            "
          >
            <span v-if="isQuickUploading">
              กำลังอัปโหลด... {{ quickUploadProgress }}%
            </span>
            <span v-else>ลากไฟล์มาวางที่นี่เพื่ออัปโหลดทันที</span>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="p-6 space-y-4">
            <Skeleton class="h-12 w-full" />
            <Skeleton class="h-12 w-full" />
            <Skeleton class="h-12 w-full" />
          </div>

          <!-- Error -->
          <div
            v-else-if="errorMessage"
            class="flex flex-col items-center justify-center py-12 text-center"
          >
            <AlertCircle class="h-12 w-12 text-destructive mb-4" />
            <h3 class="text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h3>
            <p class="text-muted-foreground mb-4">{{ errorMessage }}</p>
            <Button @click="refresh" variant="outline">
              <RefreshCw class="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredItems.length === 0"
            class="flex flex-col items-center justify-center py-12 text-center"
          >
            <component
              :is="currentLevel === 'paths' ? HardDrive : currentLevel === 'folders' ? FolderOpen : FileText"
              class="h-12 w-12 text-muted-foreground mb-4"
            />
            <h3 class="text-lg font-semibold mb-2">
              {{
                searchQuery
                  ? 'ไม่พบรายการที่ค้นหา'
                  : currentLevel === 'paths'
                  ? 'ยังไม่มี Paths'
                  : currentLevel === 'folders'
                  ? 'ยังไม่มี Folders'
                  : 'ยังไม่มีไฟล์'
              }}
            </h3>
            <p class="text-muted-foreground mb-4">
              {{
                searchQuery
                  ? 'ลองค้นหาด้วยคำอื่น'
                  : currentLevel === 'paths'
                  ? 'สร้าง Path แรกเพื่อเริ่มต้น'
                  : currentLevel === 'folders'
                  ? 'สร้าง Folder เพื่อจัดเก็บไฟล์'
                  : 'อัปโหลดไฟล์แรก'
              }}
            </p>
            <Button
              v-if="!searchQuery"
              @click="
                currentLevel === 'paths'
                  ? openPathCreate()
                  : currentLevel === 'folders'
                  ? openFolderCreate()
                  : openUploadDialog()
              "
            >
              <Plus class="h-4 w-4 mr-2" />
              {{
                currentLevel === 'paths'
                  ? 'สร้าง Path'
                  : currentLevel === 'folders'
                  ? 'สร้าง Folder'
                  : 'อัปโหลดไฟล์'
              }}
            </Button>
          </div>

          <!-- Paths Table -->
          <Table v-else-if="currentLevel === 'paths'">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[40%]">Name</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Folders</TableHead>
                <TableHead>Max Size</TableHead>
                <TableHead class="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="path in (paginatedItems as PathResponse[])"
                :key="path.id"
                class="cursor-pointer hover:bg-accent/50"
                @click="goToPath(path)"
              >
                <TableCell>
                  <div class="flex items-center gap-3">
                    <HardDrive class="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <div class="font-medium">{{ path.name }}</div>
                      <div v-if="path.description" class="text-xs text-muted-foreground">
                        {{ path.description }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{{ path.bucket_name }}</Badge>
                </TableCell>
                <TableCell>
                  {{ path.folders?.length || 0 }} folders
                </TableCell>
                <TableCell>{{ path.maximum_size_mb || 10 }} MB</TableCell>
                <TableCell @click.stop>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="goToPath(path)">
                        <FolderOpen class="h-4 w-4 mr-2" />
                        เปิด
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openPathEdit(path)">
                        <Settings class="h-4 w-4 mr-2" />
                        แก้ไข
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        @click="confirmDelete('path', path)"
                        class="text-destructive"
                      >
                        <Trash2 class="h-4 w-4 mr-2" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Folders Table -->
          <Table v-else-if="currentLevel === 'folders'">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[50%]">Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead class="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="folder in (paginatedItems as FolderResponse[])"
                :key="folder.id"
                class="cursor-pointer hover:bg-accent/50"
                @click="goToFolder(folder)"
              >
                <TableCell>
                  <div class="flex items-center gap-3">
                    <FolderOpen class="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <span class="font-medium">{{ folder.folder }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {{
                    folder.created_at
                      ? new Date(folder.created_at).toLocaleDateString('th-TH')
                      : '-'
                  }}
                </TableCell>
                <TableCell @click.stop>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="goToFolder(folder)">
                        <FolderOpen class="h-4 w-4 mr-2" />
                        เปิด
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        @click="confirmDelete('folder', folder)"
                        class="text-destructive"
                      >
                        <Trash2 class="h-4 w-4 mr-2" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Resources Table -->
          <Table v-else-if="currentLevel === 'resources'">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[40%]">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead class="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="resource in (paginatedItems as ResourceListItem[])"
                :key="resource.resource_id"
                class="cursor-pointer hover:bg-accent/50"
                @click="viewResourceDetail(resource)"
              >
                <TableCell>
                  <div class="flex items-center gap-3">
                    <component
                      :is="getFileIcon(resource.content_type)"
                      class="h-5 w-5 text-muted-foreground flex-shrink-0"
                    />
                    <div class="min-w-0">
                      <div class="font-medium truncate">
                        {{ resource.original_filename }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{{ formatFileSize(resource.size) }}</TableCell>
                <TableCell>
                  <Badge variant="secondary" class="font-mono text-xs">
                    {{ getFileExtension(resource.original_filename) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  {{
                    new Date(resource.created_at).toLocaleDateString('th-TH')
                  }}
                </TableCell>
                <TableCell @click.stop>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="viewResourceDetail(resource)">
                        <Eye class="h-4 w-4 mr-2" />
                        ดูรายละเอียด
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="downloadResource(resource)">
                        <Download class="h-4 w-4 mr-2" />
                        ดาวน์โหลด
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        @click="confirmDelete('resource', resource)"
                        class="text-destructive"
                      >
                        <Trash2 class="h-4 w-4 mr-2" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div
            v-if="!isLoading && !errorMessage && filteredItems.length > 0"
            class="flex items-center justify-between border-t px-4 py-3"
          >
            <p class="text-sm text-muted-foreground">
              แสดง {{ pageStart }}-{{ pageEnd }} จาก {{ totalItems }} รายการ
            </p>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="!canGoPrevPage"
                @click="goPrevPage"
              >
                ก่อนหน้า
              </Button>
              <span class="text-sm text-muted-foreground">
                หน้า {{ currentPage }} / {{ totalPages }}
              </span>
              <Button
                variant="outline"
                size="sm"
                :disabled="!canGoNextPage"
                @click="goNextPage"
              >
                ถัดไป
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Modals -->
    <DocumentUploadModal
      v-model:open="showUploadDialog"
      :default-path="currentPath"
      :default-folder="currentFolder"
      @success="handleUploadSuccess"
    />

    <PathCreateModal
      v-model:open="showPathCreateDialog"
      @success="handlePathCreateSuccess"
    />

    <PathEditModal
      v-model:open="showPathEditDialog"
      :path="pathToEdit"
      @success="handlePathEditSuccess"
    />

    <FolderCreateModal
      v-model:open="showFolderCreateDialog"
      :paths="currentPath ? [currentPath] : paths"
      :default-path-id="currentPath?.id"
      @success="handleFolderCreateSuccess"
    />

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ยืนยันการลบ{{ deleteType === 'path' ? ' Path' : deleteType === 'folder' ? ' Folder' : 'ไฟล์' }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการลบ "{{ getDeleteItemName() }}" ใช่หรือไม่?
            <span v-if="deleteType === 'path'" class="block mt-2 text-amber-600">
              หมายเหตุ: Path ต้องไม่มี Folders จึงจะลบได้
            </span>
            <span v-if="deleteType === 'folder'" class="block mt-2 text-amber-600">
              หมายเหตุ: Folder ต้องไม่มีไฟล์จึงจะลบได้
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeleting">ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            @click="handleDelete"
            :disabled="isDeleting"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin mr-2" />
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </MainLayout>
</template>

<style scoped></style>
