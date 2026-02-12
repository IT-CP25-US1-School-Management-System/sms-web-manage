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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Loader2 } from "lucide-vue-next";

import type { FolderResponse, UpdateFolderRequest } from "@/types/document";
import { updateFolder } from "@/stores/document";

const props = defineProps<{
  open: boolean;
  folder: FolderResponse | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}>();

const { showError } = useToast();

// Form data
const formData = ref<UpdateFolderRequest>({
  folder: "",
});

// State
const isSubmitting = ref(false);
const errors = ref<Record<string, string>>({});

// Computed
const canSubmit = computed(() => {
  return formData.value.folder.trim();
});

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  if (!formData.value.folder.trim()) {
    errors.value.folder = "กรุณากรอกชื่อ Folder";
  } else if (!/^[a-z0-9-_/]+$/.test(formData.value.folder)) {
    errors.value.folder =
      "ชื่อ Folder ต้องเป็นตัวพิมพ์เล็ก ตัวเลข - หรือ _ เท่านั้น";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm() || !props.folder) return;

  isSubmitting.value = true;

  try {
    await updateFolder(props.folder.id, {
      folder: formData.value.folder.trim(),
    });

    emit("success");
  } catch (error: any) {
    let message = "ไม่สามารถอัปเดต Folder ได้";
    
    if (error?.response?.data) {
      if (error.response.data.error?.message) {
        message = error.response.data.error.message;
      } else if (typeof error.response.data.error === 'string') {
        message = error.response.data.error;
      } else if (error.response.data.message) {
        message = error.response.data.message;
      } else if (error.response.data.detail) {
        message = error.response.data.detail;
      }
    }
    
    showError(message);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    folder: "",
  };
  errors.value = {};
};

const loadFolderData = () => {
  if (props.folder) {
    formData.value = {
      folder: props.folder.folder,
    };
  }
};

const handleClose = () => {
  if (!isSubmitting.value) {
    resetForm();
    emit("update:open", false);
  }
};

// Watchers
watch(
  () => props.open,
  (newValue) => {
    if (newValue && props.folder) {
      loadFolderData();
    } else if (!newValue) {
      resetForm();
    }
  }
);

watch(
  () => props.folder,
  () => {
    if (props.open && props.folder) {
      loadFolderData();
    }
  }
);
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>แก้ไข Folder</DialogTitle>
        <DialogDescription>
          แก้ไขชื่อ Folder "{{ folder?.folder }}"
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Path Name (Read-only) -->
        <div class="space-y-2">
          <Label>Path</Label>
          <Input :model-value="folder?.path?.name" disabled />
          <p class="text-xs text-muted-foreground">
            ไม่สามารถเปลี่ยน Path ได้
          </p>
        </div>

        <!-- Folder Name -->
        <div class="space-y-2">
          <Label for="folder">ชื่อ Folder *</Label>
          <Input
            id="folder"
            v-model="formData.folder"
            placeholder="uploads"
            :disabled="isSubmitting"
          />
          <p v-if="errors.folder" class="text-sm text-destructive">
            {{ errors.folder }}
          </p>
          <p class="text-xs text-muted-foreground">
            ใช้ตัวพิมพ์เล็ก ตัวเลข - หรือ _ เท่านั้น
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="isSubmitting">
          ยกเลิก
        </Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || isSubmitting">
          <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin mr-2" />
          {{ isSubmitting ? "กำลังบันทึก..." : "บันทึก" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
