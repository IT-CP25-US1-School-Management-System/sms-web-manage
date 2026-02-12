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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import RoleMultiSelect from "./RoleMultiSelect.vue";

import { Loader2 } from "lucide-vue-next";

import type { CreatePathRequest } from "@/types/document";
import { createPath } from "@/stores/document";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}>();

const { showError } = useToast();

// Form data
const formData = ref<CreatePathRequest>({
  name: "",
  bucket_name: "",
  description: "",
  mime_type: "",
  maximum_size_mb: 10,
  is_generate_filename: true,
  roles: [],
});

// State
const isSubmitting = ref(false);
const errors = ref<Record<string, string>>({});

// Computed
const canSubmit = computed(() => {
  return formData.value.name.trim() && formData.value.bucket_name.trim();
});

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  if (!formData.value.name.trim()) {
    errors.value.name = "กรุณากรอกชื่อ Path";
  } else if (!/^[a-z0-9-]+$/.test(formData.value.name)) {
    errors.value.name = "ชื่อ Path ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือ - เท่านั้น";
  }

  if (!formData.value.bucket_name.trim()) {
    errors.value.bucket_name = "กรุณากรอกชื่อ Bucket";
  } else if (!/^[a-z0-9-]+$/.test(formData.value.bucket_name)) {
    errors.value.bucket_name =
      "ชื่อ Bucket ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือ - เท่านั้น";
  }

  if (
    formData.value.maximum_size_mb &&
    (formData.value.maximum_size_mb < 1 || formData.value.maximum_size_mb > 1000)
  ) {
    errors.value.maximum_size_mb = "ขนาดไฟล์สูงสุดต้องอยู่ระหว่าง 1-1000 MB";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;

  try {
    await createPath({
      name: formData.value.name.trim(),
      bucket_name: formData.value.bucket_name.trim(),
      description: formData.value.description?.trim() || undefined,
      mime_type: formData.value.mime_type?.trim() || "*",
      maximum_size_mb: formData.value.maximum_size_mb || 10,
      is_generate_filename: formData.value.is_generate_filename,
      roles: formData.value.roles || [],
    });

    resetForm();
    emit("success");
  } catch (error: any) {
    const message =
      error.response?.data?.error?.message || "ไม่สามารถสร้าง Path ได้";
    showError(message);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    name: "",
    bucket_name: "",
    description: "",
    mime_type: "",
    maximum_size_mb: 10,
    is_generate_filename: true,
    roles: [],
  };
  errors.value = {};
};

const handleClose = () => {
  if (!isSubmitting.value) {
    resetForm();
    emit("update:open", false);
  }
};

// Auto-generate bucket name from path name
const autoGenerateBucket = () => {
  if (formData.value.name && !formData.value.bucket_name) {
    formData.value.bucket_name = `sms-${formData.value.name}`;
  }
};

// Watchers
watch(
  () => props.open,
  (newValue) => {
    if (!newValue) {
      resetForm();
    }
  }
);
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>สร้าง Path ใหม่</DialogTitle>
        <DialogDescription>
          Path คือ Bucket สำหรับจัดเก็บไฟล์ใน MinIO
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Name -->
        <div class="space-y-2">
          <Label for="name">ชื่อ Path *</Label>
          <Input
            id="name"
            v-model="formData.name"
            placeholder="documents"
            @blur="autoGenerateBucket"
            :disabled="isSubmitting"
          />
          <p v-if="errors.name" class="text-sm text-destructive">
            {{ errors.name }}
          </p>
          <p class="text-xs text-muted-foreground">
            ใช้ตัวพิมพ์เล็ก ตัวเลข หรือ - เท่านั้น
          </p>
        </div>

        <!-- Bucket Name -->
        <div class="space-y-2">
          <Label for="bucket_name">Bucket Name *</Label>
          <Input
            id="bucket_name"
            v-model="formData.bucket_name"
            placeholder="sms-documents"
            :disabled="isSubmitting"
          />
          <p v-if="errors.bucket_name" class="text-sm text-destructive">
            {{ errors.bucket_name }}
          </p>
          <p class="text-xs text-muted-foreground">
            ชื่อ Bucket ใน MinIO (ต้องไม่ซ้ำกับที่มีอยู่)
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="description">คำอธิบาย</Label>
          <Textarea
            id="description"
            v-model="formData.description"
            placeholder="คำอธิบาย Path (ไม่บังคับ)"
            :disabled="isSubmitting"
          />
        </div>

        <!-- MIME Types -->
        <div class="space-y-2">
          <Label for="mime_type">ประเภทไฟล์ที่อนุญาต</Label>
          <Input
            id="mime_type"
            v-model="formData.mime_type"
            placeholder="application/pdf, image/png, image/jpeg"
            :disabled="isSubmitting"
          />
          <p class="text-xs text-muted-foreground">
            คั่นด้วย comma (ว่างไว้ = อนุญาตทุกประเภท)
          </p>
        </div>

        <RoleMultiSelect
          v-model="formData.roles"
          :disabled="isSubmitting"
        />

        <!-- Maximum Size -->
        <div class="space-y-2">
          <Label for="maximum_size_mb">ขนาดไฟล์สูงสุด (MB)</Label>
          <Input
            id="maximum_size_mb"
            v-model.number="formData.maximum_size_mb"
            type="number"
            min="1"
            max="1000"
            :disabled="isSubmitting"
          />
          <p v-if="errors.maximum_size_mb" class="text-sm text-destructive">
            {{ errors.maximum_size_mb }}
          </p>
        </div>

        <!-- Auto Generate Filename -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>สร้างชื่อไฟล์อัตโนมัติ</Label>
            <p class="text-xs text-muted-foreground">
              ใช้ UUID แทนชื่อไฟล์ต้นฉบับเพื่อป้องกันชื่อซ้ำ
            </p>
          </div>
          <Switch
            v-model:checked="formData.is_generate_filename"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="isSubmitting">
          ยกเลิก
        </Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || isSubmitting">
          <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin mr-2" />
          {{ isSubmitting ? "กำลังสร้าง..." : "สร้าง Path" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
