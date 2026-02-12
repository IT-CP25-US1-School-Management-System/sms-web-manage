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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2 } from "lucide-vue-next";

import type { PathResponse, CreateFolderRequest } from "@/types/document";
import { createFolder } from "@/stores/document";

const props = defineProps<{
  open: boolean;
  paths: PathResponse[];
  defaultPathId?: string;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}>();

const { showError } = useToast();

// Form data
const formData = ref<CreateFolderRequest>({
  path_id: "",
  folder: "",
});

// State
const isSubmitting = ref(false);
const errors = ref<Record<string, string>>({});

// Computed
const canSubmit = computed(() => {
  return formData.value.path_id && formData.value.folder.trim();
});

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  if (!formData.value.path_id) {
    errors.value.path_id = "กรุณาเลือก Path";
  }

  if (!formData.value.folder.trim()) {
    errors.value.folder = "กรุณากรอกชื่อ Folder";
  } else if (!/^[a-z0-9-_/]+$/.test(formData.value.folder)) {
    errors.value.folder =
      "ชื่อ Folder ต้องเป็นตัวพิมพ์เล็ก ตัวเลข - หรือ _ เท่านั้น";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;

  try {
    await createFolder({
      path_id: formData.value.path_id,
      folder: formData.value.folder.trim(),
    });

    resetForm();
    emit("success");
  } catch (error: any) {
    const message =
      error.response?.data?.error?.message || "ไม่สามารถสร้าง Folder ได้";
    showError(message);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    path_id: props.defaultPathId || "",
    folder: "",
  };
  errors.value = {};
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
    if (newValue) {
      formData.value.path_id = props.defaultPathId || "";
    } else {
      resetForm();
    }
  },
);

watch(
  () => props.defaultPathId,
  (newValue) => {
    if (props.open && newValue) {
      formData.value.path_id = newValue;
    }
  },
);
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>สร้าง Folder ใหม่</DialogTitle>
        <DialogDescription>
          Folder คือโฟลเดอร์ย่อยภายใน Path
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Path Selection -->
        <div class="space-y-2">
          <Label>Path *</Label>
          <Select v-model="formData.path_id" :disabled="isSubmitting">
            <SelectTrigger>
              <SelectValue placeholder="เลือก Path" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="path in paths" :key="path.id" :value="path.id">
                {{ path.name }}
                <span v-if="path.description" class="text-muted-foreground">
                  - {{ path.description }}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.path_id" class="text-sm text-destructive">
            {{ errors.path_id }}
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
            ใช้ตัวพิมพ์เล็ก ตัวเลข - หรือ _ เท่านั้น และสามารถมี /
            เพื่อสร้างโฟลเดอร์ย่อยได้
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="isSubmitting">
          ยกเลิก
        </Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || isSubmitting">
          <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin mr-2" />
          {{ isSubmitting ? "กำลังสร้าง..." : "สร้าง Folder" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
