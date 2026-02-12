<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useToast } from "@/composables/useToast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import { Upload, Loader2, X, FileText, AlertCircle } from "lucide-vue-next";

import type { PathResponse, FolderResponse } from "@/types/document";
import {
  createResource,
  listPaths,
  listFolders,
  validateFile,
  formatFileSize,
} from "@/stores/document";

const props = defineProps<{
  open: boolean;
  defaultPath?: PathResponse | null;
  defaultFolder?: FolderResponse | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}>();

const { showError } = useToast();

// Form data
const selectedFile = ref<File | null>(null);
const selectedPathId = ref<string>("");
const selectedFolderId = ref<string>("");
const description = ref("");

// State
const paths = ref<PathResponse[]>([]);
const folders = ref<FolderResponse[]>([]);
const filteredFolders = ref<FolderResponse[]>([]);
const isLoading = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const dragOver = ref(false);
const fileError = ref<string | null>(null);

// Computed
const selectedPath = computed(() =>
  paths.value.find((p) => p.id === selectedPathId.value)
);

const canSubmit = computed(() => {
  if (!selectedFile.value) return false;
  if (!selectedPathId.value) return false;
  if (!selectedFolderId.value) return false;
  if (fileError.value) return false;
  return true;
});

// Check if we have pre-selected path and folder (browsing mode)
const hasDefaults = computed(() => {
  return props.defaultPath && props.defaultFolder;
});

// Methods
const loadData = async () => {
  isLoading.value = true;
  try {
    // If we have defaults, use them directly
    if (props.defaultPath && props.defaultFolder) {
      paths.value = [props.defaultPath];
      folders.value = [props.defaultFolder];
      selectedPathId.value = props.defaultPath.id;
      selectedFolderId.value = props.defaultFolder.id;
      filteredFolders.value = [props.defaultFolder];
    } else {
      // Otherwise load all paths and folders
      const [pathsData, foldersData] = await Promise.all([
        listPaths(),
        listFolders(),
      ]);
      paths.value = pathsData;
      folders.value = foldersData;
      
      // Set default if provided
      if (props.defaultPath) {
        selectedPathId.value = props.defaultPath.id;
        filteredFolders.value = foldersData.filter(
          (f) => f.path_id === props.defaultPath!.id
        );
      }
    }
  } catch (error: any) {
    showError("ไม่สามารถโหลดข้อมูลได้");
  } finally {
    isLoading.value = false;
  }
};

const handlePathChange = () => {
  // Don't reset folder if we have defaults
  if (!hasDefaults.value) {
    selectedFolderId.value = "";
  }
  
  if (selectedPathId.value) {
    filteredFolders.value = folders.value.filter(
      (f) => f.path_id === selectedPathId.value
    );
  } else {
    filteredFolders.value = [];
  }
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    validateAndSetFile(input.files[0]);
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = false;

  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    validateAndSetFile(event.dataTransfer.files[0]);
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = () => {
  dragOver.value = false;
};

const validateAndSetFile = (file: File) => {
  fileError.value = null;

  // Validate based on selected path settings
  const maxSize = selectedPath.value?.maximum_size_mb || 10;
  const mimeType = selectedPath.value?.mime_type?.trim();
  
  // If mime_type is "*", allow all file types
  const allowedTypes = (mimeType && mimeType !== "*") 
    ? mimeType.split(",").map((t) => t.trim())
    : undefined;

  const validation = validateFile(file, {
    maxSizeMB: maxSize,
    allowedMimeTypes: allowedTypes,
  });

  if (!validation.valid) {
    fileError.value = validation.error || "ไฟล์ไม่ถูกต้อง";
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
};

const removeFile = () => {
  selectedFile.value = null;
  fileError.value = null;
};

const handleSubmit = async () => {
  if (!canSubmit.value || !selectedFile.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const selectedFolder = folders.value.find(
      (f) => f.id === selectedFolderId.value
    );

    if (!selectedFolder || !selectedPath.value) {
      showError("กรุณาเลือก Path และ Folder");
      return;
    }

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    await createResource(selectedFile.value, {
      path: selectedPath.value.name,
      folder: selectedFolder.folder,
      uploaded_by: "current-user", // TODO: Get from auth store
      description: description.value || undefined,
    });

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    setTimeout(() => {
      resetForm();
      emit("success");
    }, 500);
  } catch (error: any) {
    showError(
      error.response?.data?.error?.message ||
        error.response?.data?.error ||
        "ไม่สามารถอัปโหลดไฟล์ได้"
    );
  } finally {
    isUploading.value = false;
  }
};

const resetForm = () => {
  selectedFile.value = null;
  selectedPathId.value = "";
  selectedFolderId.value = "";
  description.value = "";
  uploadProgress.value = 0;
  fileError.value = null;
  filteredFolders.value = [];
};

const handleClose = () => {
  if (!isUploading.value) {
    resetForm();
    emit("update:open", false);
  }
};

// Watchers
watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      loadData();
    }
  }
);

watch(selectedPathId, handlePathChange);
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>อัปโหลดไฟล์</DialogTitle>
        <DialogDescription>
          <template v-if="hasDefaults">
            อัปโหลดไฟล์ไปยัง {{ defaultPath?.name }} / {{ defaultFolder?.folder }}
          </template>
          <template v-else>
            เลือกไฟล์และกำหนดตำแหน่งที่จะจัดเก็บ
          </template>
        </DialogDescription>
      </DialogHeader>

      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <div v-else class="space-y-4 py-4">
        <!-- Path Selection (hidden if defaults provided) -->
        <div v-if="!hasDefaults" class="space-y-2">
          <Label>Path *</Label>
          <Select v-model="selectedPathId" :disabled="isUploading">
            <SelectTrigger>
              <SelectValue placeholder="เลือก Path" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="path in paths" :key="path.id" :value="path.id">
                <div class="max-w-full">
                  <span>{{ path.name }}</span>
                  <span v-if="path.description" class="text-muted-foreground block truncate">
                    - {{ path.description }}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div
            v-if="selectedPath"
            class="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          >
            <p>ขนาดไฟล์สูงสุด: {{ selectedPath.maximum_size_mb || 10 }} MB</p>
            <p v-if="selectedPath.mime_type" class="break-words break-all overflow-wrap-anywhere leading-relaxed">
              ประเภทที่อนุญาต: {{ selectedPath.mime_type }}
            </p>
          </div>
        </div>

        <!-- Folder Selection (hidden if defaults provided) -->
        <div v-if="!hasDefaults" class="space-y-2">
          <Label>Folder *</Label>
          <Select
            v-model="selectedFolderId"
            :disabled="!selectedPathId || isUploading"
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือก Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="folder in filteredFolders"
                :key="folder.id"
                :value="folder.id"
              >
                {{ folder.folder }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p
            v-if="selectedPathId && filteredFolders.length === 0"
            class="text-xs text-amber-600"
          >
            ไม่มี Folder ใน Path นี้ กรุณาสร้าง Folder ก่อน
          </p>
        </div>

        <!-- Show current location if defaults provided -->
        <div v-if="hasDefaults" class="rounded-lg border bg-muted/40 p-3">
          <p class="text-sm">
            <span class="text-muted-foreground">ตำแหน่ง:</span>
            <span class="font-medium ml-2">
              {{ defaultPath?.name }} / {{ defaultFolder?.folder }}
            </span>
          </p>
          <div
            v-if="selectedPath"
            class="mt-1 space-y-1 text-xs text-muted-foreground"
          >
            <p>ขนาดไฟล์สูงสุด: {{ selectedPath.maximum_size_mb || 10 }} MB</p>
            <p v-if="selectedPath.mime_type" class="break-words break-all overflow-wrap-anywhere leading-relaxed">
              ประเภทที่อนุญาต: {{ selectedPath.mime_type }}
            </p>
          </div>
        </div>

        <!-- File Upload Area -->
        <div class="space-y-2">
          <Label>ไฟล์ *</Label>
          <div
            v-if="!selectedFile"
            class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
            :class="{
              'border-primary bg-primary/5': dragOver,
              'border-muted-foreground/25 hover:border-primary/50': !dragOver,
            }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <Upload class="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p class="text-sm text-muted-foreground mb-2">
              ลากไฟล์มาวางที่นี่ หรือ
            </p>
            <label>
              <input
                type="file"
                class="hidden"
                @change="handleFileSelect"
                :disabled="isUploading"
              />
              <Button type="button" variant="outline" size="sm" as="span">
                เลือกไฟล์
              </Button>
            </label>
          </div>

          <!-- Selected File -->
          <div
            v-else
            class="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
          >
            <FileText class="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ selectedFile.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatFileSize(selectedFile.size) }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              @click="removeFile"
              :disabled="isUploading"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- File Error -->
          <div v-if="fileError" class="flex items-start gap-2 text-destructive">
            <AlertCircle class="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p class="text-sm break-words">{{ fileError }}</p>
          </div>
        </div>

        <div class="space-y-2">
          <Label>คำอธิบาย</Label>
          <Textarea
            v-model="description"
            placeholder="คำอธิบายเอกสาร (ไม่บังคับ)"
            :disabled="isUploading"
          />
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span>กำลังอัปโหลด...</span>
            <span>{{ uploadProgress }}%</span>
          </div>
          <Progress :model-value="uploadProgress" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="isUploading">
          ยกเลิก
        </Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || isUploading">
          <Loader2 v-if="isUploading" class="h-4 w-4 animate-spin mr-2" />
          {{ isUploading ? "กำลังอัปโหลด..." : "อัปโหลด" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
