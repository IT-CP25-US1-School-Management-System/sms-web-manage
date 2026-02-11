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
  ArrowLeft,
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

    // Note: The API might return metadata in a different structure
    // Adjust based on actual API response
    if ((result as any).metadata) {
      metadata.value = (result as any).metadata;
      editDescription.value = metadata.value?.description || "";
      editStatus.value = metadata.value?.status || "";
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
  router.push({ name: ROUTE_NAMES.DOCUMENTS });
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
        <div class="flex items-center gap-4">
          <Button variant="ghost" size="icon" @click="goBack">
            <ArrowLeft class="h-5 w-5" />
          </Button>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">รายละเอียดเอกสาร</h1>
            <p class="text-muted-foreground mt-2">
              ดูและจัดการข้อมูลเอกสาร
            </p>
          </div>
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
                <p>.{{ resource.extension }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">ชื่อไฟล์ใน Storage</Label>
                <p class="truncate">{{ resource.storage_filename }}</p>
              </div>
              <div class="col-span-2">
                <Label class="text-muted-foreground">Object Path</Label>
                <p class="font-mono text-sm break-all">
                  {{ resource.object_name }}
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
