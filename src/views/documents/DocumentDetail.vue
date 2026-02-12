<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useToast } from "@/composables/useToast";

import MainLayout from "@/layouts/MainLayout.vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTE_NAMES } from "@/lib/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  FileArchive,
  File,
  Save,
  ExternalLink,
  HardDrive,
  FolderOpen,
  ChevronRight,
} from "lucide-vue-next";

import { useRouter, useRoute } from "vue-router";
import type { FileResponse, DocumentStatus } from "@/types/document";
import { DOCUMENT_STATUS } from "@/types/document";
import {
  getResourceById,
  updateResource,
  deleteResource,
  formatFileSize,
} from "@/stores/document";

const router = useRouter();
const route = useRoute();

// Reactive data
const resource = ref<FileResponse | null>(null);
const metadata = ref<{
  id?: string;
  status?: DocumentStatus;
  description?: string;
  uploaded_by?: string;
  tags?: string[];
  created_at?: string;
} | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

// Form data for editing
const editDescription = ref("");
const editStatus = ref<DocumentStatus | "">("");

const { showError, showSuccess } = useToast();

// Computed
const resourceId = computed(() => route.params.resourceId as string);

const hasChanges = computed(() => {
  if (!metadata.value) return false;
  return (
    editDescription.value !== (metadata.value.description || "") ||
    editStatus.value !== (metadata.value.status || "")
  );
});

const getFileIcon = computed(() => {
  if (!resource.value) return File;
  const contentType = resource.value.content_type;
  if (contentType.startsWith("image/")) return Image;
  if (contentType.startsWith("video/")) return Video;
  if (contentType.startsWith("audio/")) return Music;
  if (contentType.includes("zip") || contentType.includes("compressed"))
    return FileArchive;
  if (contentType === "application/pdf") return FileText;
  return File;
});

const getStatusBadgeVariant = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "PENDING":
    default:
      return "secondary";
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ถูกปฏิเสธ";
    case "PENDING":
    default:
      return "รอตรวจสอบ";
  }
};

const breadcrumbPathName = computed(() => {
  if (typeof route.query.pathName === "string" && route.query.pathName) {
    return route.query.pathName;
  }

  return resource.value?.folder?.path?.name || "-";
});

const breadcrumbFolderName = computed(() => {
  if (typeof route.query.folderName === "string" && route.query.folderName) {
    return route.query.folderName;
  }

  return resource.value?.folder?.folder || "-";
});

const breadcrumbFileName = computed(() => {
  if (typeof route.query.fileName === "string" && route.query.fileName) {
    return route.query.fileName;
  }

  return resource.value?.original_filename || "ไฟล์";
});

const breadcrumbPathId = computed(() => {
  if (typeof route.query.pathId === "string" && route.query.pathId) {
    return route.query.pathId;
  }
  return resource.value?.folder?.path?.id || "";
});

const breadcrumbFolderId = computed(() => {
  if (typeof route.query.folderId === "string" && route.query.folderId) {
    return route.query.folderId;
  }
  return resource.value?.folder?.id || "";
});

const displayExtension = computed(() => {
  if (!resource.value) return "-";

  const ext = (resource.value.extension || "").trim().replace(/^\./, "");
  if (ext) return ext;

  const filename = resource.value.original_filename || "";
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0 && lastDot < filename.length - 1) {
    return filename.slice(lastDot + 1).toLowerCase();
  }

  const subtype = resource.value.content_type?.split("/")?.[1]?.split(";")?.[0];
  if (subtype && subtype !== "octet-stream") return subtype;

  return "-";
});

const displayObjectPath = computed(() => {
  if (!resource.value) return "-";

  if (resource.value.object_name) return resource.value.object_name;

  const bucket =
    resource.value.folder?.path?.bucket_name || resource.value.folder?.path?.name;
  const folderName = resource.value.folder?.folder;
  const filename = resource.value.storage_filename;

  const parts = [bucket, folderName, filename].filter(
    (part): part is string => Boolean(part)
  );

  return parts.length > 0 ? parts.join("/") : "-";
});

// Lifecycle
onMounted(() => {
  loadResource();
});

// API functions
const loadResource = async () => {
  if (!resourceId.value) return;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const result = await getResourceById(resourceId.value);
    resource.value = result;

    if (result.metadata) {
      metadata.value = result.metadata;
      editDescription.value = metadata.value?.description || "";
      editStatus.value = metadata.value?.status || "";
    } else {
      metadata.value = {
        created_at: result.created_at,
      };
    }
  } catch (error: any) {
    console.error("Error loading resource:", error);
    errorMessage.value =
      error.response?.data?.error?.message || "ไม่สามารถโหลดข้อมูลเอกสารได้";
    if (errorMessage.value) {
      showError(errorMessage.value);
    }
  } finally {
    isLoading.value = false;
  }
};

// Actions
const goBack = () => {
  if (breadcrumbPathId.value && breadcrumbFolderId.value) {
    router.push({
      name: ROUTE_NAMES.DOCUMENTS,
      query: {
        pathId: breadcrumbPathId.value,
        folderId: breadcrumbFolderId.value,
      },
    });
    return;
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push({ name: ROUTE_NAMES.DOCUMENTS });
};

const goToDocuments = () => {
  router.push({ name: ROUTE_NAMES.DOCUMENTS });
};

const goToPathLevel = () => {
  if (!breadcrumbPathId.value) {
    goToDocuments();
    return;
  }

  router.push({
    name: ROUTE_NAMES.DOCUMENTS,
    query: {
      pathId: breadcrumbPathId.value,
    },
  });
};

const goToFolderLevel = () => {
  if (!breadcrumbPathId.value || !breadcrumbFolderId.value) {
    goToPathLevel();
    return;
  }

  router.push({
    name: ROUTE_NAMES.DOCUMENTS,
    query: {
      pathId: breadcrumbPathId.value,
      folderId: breadcrumbFolderId.value,
    },
  });
};

const downloadFile = () => {
  if (resource.value?.url) {
    window.open(resource.value.url, "_blank");
  }
};

const openInNewTab = () => {
  if (resource.value?.url) {
    window.open(resource.value.url, "_blank");
  }
};

const saveChanges = async () => {
  if (!resourceId.value || !hasChanges.value) return;

  isSaving.value = true;

  try {
    await updateResource(resourceId.value, {
      description: editDescription.value || undefined,
      status: editStatus.value as DocumentStatus || undefined,
    });

    showSuccess("บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว");
    await loadResource();
  } catch (error: any) {
    showError(
      error.response?.data?.error?.message || "ไม่สามารถบันทึกข้อมูลได้"
    );
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = () => {
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!resourceId.value) return;

  isDeleting.value = true;
  try {
    await deleteResource(resourceId.value);
    showSuccess("ลบเอกสารเรียบร้อยแล้ว");
    showDeleteDialog.value = false;
    router.push({ name: ROUTE_NAMES.DOCUMENTS });
  } catch (error: any) {
    showError(error.response?.data?.error?.message || "ไม่สามารถลบเอกสารได้");
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">รายละเอียดเอกสาร</h1>
          <p class="text-muted-foreground mt-2">
            ดูและจัดการข้อมูลเอกสาร
          </p>
        </div>
        <div class="flex gap-2" v-if="resource">
          <Button variant="outline" @click="openInNewTab">
            <ExternalLink class="h-4 w-4 mr-2" />
            เปิดไฟล์
          </Button>
          <Button variant="outline" @click="downloadFile">
            <Download class="h-4 w-4 mr-2" />
            ดาวน์โหลด
          </Button>
          <Button variant="destructive" @click="confirmDelete">
            <Trash2 class="h-4 w-4 mr-2" />
            ลบ
          </Button>
        </div>
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              as="button"
              class="flex items-center gap-1 hover:text-foreground"
              @click="goToDocuments"
            >
              <HardDrive class="h-4 w-4" />
              Paths
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbLink
              as="button"
              class="flex items-center gap-1 hover:text-foreground"
              @click="goToPathLevel"
            >
              <FolderOpen class="h-4 w-4" />
              {{ breadcrumbPathName }}
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbLink
              as="button"
              class="flex items-center gap-1 hover:text-foreground"
              @click="goToFolderLevel"
            >
              <FolderOpen class="h-4 w-4" />
              {{ breadcrumbFolderName }}
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight class="h-4 w-4" />
          </BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbPage class="max-w-[360px] truncate">
              {{ breadcrumbFileName }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <!-- Loading state -->
      <div v-if="isLoading" class="space-y-4">
        <Card>
          <CardContent class="p-6">
            <div class="space-y-4">
              <Skeleton class="h-8 w-1/2" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Error state -->
      <Card v-else-if="errorMessage">
        <CardContent
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <AlertCircle class="h-12 w-12 text-destructive mb-4" />
          <h3 class="text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h3>
          <p class="text-muted-foreground mb-4">{{ errorMessage }}</p>
          <div class="flex gap-2">
            <Button @click="loadResource()" variant="outline">
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ลองใหม่
            </Button>
            <Button @click="goBack" variant="ghost"> กลับ </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Resource Details -->
      <div v-else-if="resource" class="grid gap-6 md:grid-cols-2">
        <!-- File Info Card -->
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลไฟล์</CardTitle>
            <CardDescription>รายละเอียดทั่วไปของไฟล์</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- File Preview/Icon -->
            <div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <component
                :is="getFileIcon"
                class="h-12 w-12 text-muted-foreground"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">
                  {{ resource.original_filename }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ resource.content_type }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label class="text-muted-foreground">Resource ID</Label>
                <p class="font-mono text-sm break-all">
                  {{ resource.resource_id }}
                </p>
              </div>
              <div>
                <Label class="text-muted-foreground">ขนาดไฟล์</Label>
                <p>{{ formatFileSize(resource.size) }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">นามสกุล</Label>
                <p>{{ displayExtension === "-" ? "-" : `.${displayExtension}` }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">ชื่อไฟล์ใน Storage</Label>
                <p class="truncate">{{ resource.storage_filename }}</p>
              </div>
              <div class="col-span-2">
                <Label class="text-muted-foreground">Object Path</Label>
                <p class="font-mono text-sm break-all">
                  {{ displayObjectPath }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Metadata Card -->
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>ข้อมูลเพิ่มเติมและสถานะ</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Status -->
            <div class="space-y-2">
              <Label>สถานะ</Label>
              <div class="flex items-center gap-2">
                <Badge
                  :variant="getStatusBadgeVariant(metadata?.status)"
                  class="text-sm"
                >
                  {{ getStatusLabel(metadata?.status) }}
                </Badge>
              </div>
            </div>

            <!-- Edit Status -->
            <div class="space-y-2">
              <Label>เปลี่ยนสถานะ</Label>
              <Select v-model="editStatus">
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="DOCUMENT_STATUS.PENDING">
                    รอตรวจสอบ
                  </SelectItem>
                  <SelectItem :value="DOCUMENT_STATUS.APPROVED">
                    อนุมัติ
                  </SelectItem>
                  <SelectItem :value="DOCUMENT_STATUS.REJECTED">
                    ปฏิเสธ
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Uploaded By -->
            <div v-if="metadata?.uploaded_by" class="space-y-2">
              <Label class="text-muted-foreground">อัปโหลดโดย</Label>
              <p>{{ metadata.uploaded_by }}</p>
            </div>

            <!-- Created At -->
            <div v-if="metadata?.created_at" class="space-y-2">
              <Label class="text-muted-foreground">วันที่สร้าง</Label>
              <p>
                {{
                  new Date(metadata.created_at).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
            </div>

            <!-- Tags -->
            <div v-if="metadata?.tags && metadata.tags.length > 0" class="space-y-2">
              <Label class="text-muted-foreground">Tags</Label>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="tag in metadata.tags"
                  :key="tag"
                  variant="outline"
                >
                  {{ tag }}
                </Badge>
              </div>
            </div>

            <!-- Description -->
            <div class="space-y-2">
              <Label>คำอธิบาย</Label>
              <Textarea
                v-model="editDescription"
                placeholder="เพิ่มคำอธิบาย (ไม่บังคับ)"
                :disabled="isSaving"
              />
            </div>

            <!-- Save Button -->
            <Button
              @click="saveChanges"
              :disabled="!hasChanges || isSaving"
              class="w-full"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin mr-2" />
              <Save v-else class="h-4 w-4 mr-2" />
              {{ isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง" }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบเอกสาร</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการลบเอกสาร "{{ resource?.original_filename }}" ใช่หรือไม่?
            การกระทำนี้ไม่สามารถย้อนกลับได้
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
            ลบเอกสาร
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </MainLayout>
</template>

<style scoped></style>
