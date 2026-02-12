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

import type { PathResponse, UpdatePathRequest } from "@/types/document";
import { updatePath } from "@/stores/document";

const props = defineProps<{
  open: boolean;
  path: PathResponse | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}>();

const { showError } = useToast();

// Form data
const formData = ref<UpdatePathRequest>({
  name: "",
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
  return formData.value.name?.trim();
});

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  if (formData.value.name && !/^[a-z0-9-]+$/.test(formData.value.name)) {
    errors.value.name = "ชื่อ Path ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือ - เท่านั้น";
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
  if (!validateForm() || !props.path) return;

  isSubmitting.value = true;

  try {
    await updatePath(props.path.id, {
      name: formData.value.name?.trim() || undefined,
      description: formData.value.description?.trim() || undefined,
      mime_type: formData.value.mime_type?.trim() || undefined,
      maximum_size_mb: formData.value.maximum_size_mb || undefined,
      is_generate_filename: formData.value.is_generate_filename,
      roles: formData.value.roles || [],
    });

    emit("success");
  } catch (error: any) {
    const message =
      error.response?.data?.error?.message || "ไม่สามารถอัปเดต Path ได้";
    showError(message);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    name: "",
    description: "",
    mime_type: "",
    maximum_size_mb: 10,
    is_generate_filename: true,
    roles: [],
  };
  errors.value = {};
};

const loadPathData = () => {
  if (props.path) {
    formData.value = {
      name: props.path.name,
      description: props.path.description || "",
      mime_type: props.path.mime_type || "",
      maximum_size_mb: props.path.maximum_size_mb || 10,
      is_generate_filename: props.path.is_generate_filename ?? true,
      roles: props.path.roles || [],
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
    if (newValue && props.path) {
      loadPathData();
    } else if (!newValue) {
      resetForm();
    }
  }
);

watch(
  () => props.path,
  () => {
    if (props.open && props.path) {
      loadPathData();
    }
  }
);
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>แก้ไข Path</DialogTitle>
        <DialogDescription>
          แก้ไขการตั้งค่า Path "{{ path?.name }}"
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Name -->
        <div class="space-y-2">
          <Label for="name">ชื่อ Path</Label>
          <Input
            id="name"
            v-model="formData.name"
            placeholder="documents"
            :disabled="isSubmitting"
          />
          <p v-if="errors.name" class="text-sm text-destructive">
            {{ errors.name }}
          </p>
          <p class="text-xs text-muted-foreground">
            ใช้ตัวพิมพ์เล็ก ตัวเลข หรือ - เท่านั้น
          </p>
        </div>

        <!-- Bucket Name (Read-only) -->
        <div class="space-y-2">
          <Label>Bucket Name</Label>
          <Input :model-value="path?.bucket_name" disabled />
          <p class="text-xs text-muted-foreground">
            ไม่สามารถเปลี่ยน Bucket Name ได้
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
          {{ isSubmitting ? "กำลังบันทึก..." : "บันทึก" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
