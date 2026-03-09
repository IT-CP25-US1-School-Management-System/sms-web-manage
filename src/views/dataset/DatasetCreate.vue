<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Loader2, X, Database, FileText, Tags } from "lucide-vue-next";
import { dataApiInstance } from "@/stores/api";
import { ROUTE_NAMES } from "@/lib/constants";
import type { DatasetUpsert, ApiResponse } from "@/types/dataset";

const router = useRouter();
const { showError, showSuccess } = useToast();

// Reactive data
const isCreating = ref(false);
const newTag = ref("");
const showSheet = ref(true); // Control sheet visibility

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false;
  // Wait for animation then navigate
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.DATASET });
  }, 300);
};

// Form validation schema
const ชุดข้อมูลSchema = toTypedSchema(
  z.object({
    id: z
      .string()
      .min(1, "กรุณาระบุ ชื่อชุดข้อมูลสำหรับ Api")
      .max(50, "ชื่อชุดข้อมูลสำหรับ Api ต้องไม่เกิน 50 ตัวอักษร")
      .regex(
        /^[a-z_][a-z0-9_]*$/,
        "ชื่อชุดข้อมูลสำหรับ Api ต้องขึ้นต้นด้วยตัวอักษรเล็กหรือ _ และใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น",
      ),
    name: z
      .string()
      .min(1, "กรุณาระบุชื่อ ชุดข้อมูล")
      .max(100, "ชื่อ ชุดข้อมูล ต้องไม่เกิน 100 ตัวอักษร"),
    description: z
      .string()
      .min(1, "กรุณาระบุคำอธิบาย ชุดข้อมูล")
      .max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
    domain: z
      .string()
      .min(1, "กรุณาระบุ หมวดหมู่")
      .max(50, "หมวดหมู่ ต้องไม่เกิน 50 ตัวอักษร"),
    owner: z
      .string()
      .min(1, "กรุณาระบุชื่อ Owner")
      .max(100, "ชื่อ Owner ต้องไม่เกิน 100 ตัวอักษร"),
    tags: z.array(z.string()).optional(),
  }),
);

// Form setup
const { handleSubmit, values, setFieldValue } = useForm({
  validationSchema: ชุดข้อมูลSchema,
  initialValues: {
    id: "",
    name: "",
    description: "",
    domain: "",
    owner: "",
    tags: [] as string[],
  },
});

// API functions
const createDataset = async (
  dataset: DatasetUpsert,
): Promise<ApiResponse<any>> => {
  try {
    const response = await dataApiInstance.post<ApiResponse<any>>(
      "/v1/datasets",
      dataset,
    );
    return response.data;
  } catch (error: any) {
    console.error("Error creating dataset:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถสร้าง ชุดข้อมูล ได้";
    if (error.response?.status === 400) {
      throw new Error(
        "ข้อมูล ชุดข้อมูล ไม่ถูกต้อง โปรดตรวจสอบข้อมูลให้ครบถ้วน",
      );
    }
    if (error.response?.status === 409) {
      throw new Error("ชุดข้อมูล ID นี้มีอยู่แล้ว โปรดใช้ ID อื่น");
    }
    throw new Error(errorMessage);
  }
};

// Functions
const addTag = () => {
  if (newTag.value.trim() && !values.tags?.includes(newTag.value.trim())) {
    const currentTags = values.tags || [];
    setFieldValue("tags", [...currentTags, newTag.value.trim()]);
    newTag.value = "";
  }
};

const removeTag = (tagToRemove: string) => {
  if (values.tags) {
    setFieldValue(
      "tags",
      values.tags.filter((tag) => tag !== tagToRemove),
    );
  }
};

const handleCreateDataset = handleSubmit(async (formData) => {
  isCreating.value = true;
  try {
    // Add default values for sensitivity and has_pii
    const datasetData = {
      ...formData,
      sensitivity: "public",
      has_pii: false,
    };
    await createDataset(datasetData as DatasetUpsert);
    showSuccess(`สร้าง ชุดข้อมูล "${formData.name}" เรียบร้อยแล้ว`);
    closeSheet();
  } catch (error: any) {
    console.error("Error creating ชุดข้อมูล:", error);
    showError(error.message || "ไม่สามารถสร้าง ชุดข้อมูล ได้");
  } finally {
    isCreating.value = false;
  }
});
</script>

<template>
  <Sheet
    v-model:open="showSheet"
    @update:open="(open) => !open && closeSheet()"
  >
    <SheetContent
      class="sm:max-w-lg max-w-md p-0 overflow-hidden flex flex-col"
    >
      <SheetHeader class="px-6 pt-6 pb-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
          >
            <Database class="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle class="text-xl">สร้างชุดข้อมูลใหม่</SheetTitle>
            <SheetDescription>
              กรอกข้อมูลเพื่อสร้างชุดข้อมูลใหม่ในระบบ
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Separator />

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <form
          id="createDatasetForm"
          @submit="handleCreateDataset"
          class="space-y-6"
        >
          <!-- Section: ข้อมูลพื้นฐาน -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <FileText class="h-4 w-4" />
              <span>ข้อมูลพื้นฐาน</span>
            </div>
            <!-- ชุดข้อมูล ID -->
            <FormField v-slot="{ componentField }" name="id">
              <FormItem>
                <FormLabel
                  >ชื่อชุดข้อมูลสำหรับ Api
                  <span class="text-red-500">*</span></FormLabel
                >
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="เช่น person_data_stat_view"
                    class="font-mono"
                  />
                </FormControl>
                <FormDescription>
                  ต้องขึ้นต้นด้วยตัวอักษรเล็กหรือ _ และใช้ตัวอักษรเล็ก ตัวเลข
                  และ _ เท่านั้น
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- ชุดข้อมูล Name -->
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel
                  >ชื่อชุดข้อมูล <span class="text-red-500">*</span></FormLabel
                >
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="เช่น Student Records 2024"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Description -->
            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel
                  >คำอธิบาย <span class="text-red-500">*</span></FormLabel
                >
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="อธิบายเกี่ยวกับข้อมูลในชุดข้อมูลนี้..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Domain -->
            <FormField v-slot="{ componentField }" name="domain">
              <FormItem>
                <FormLabel
                  >หมวดหมู่ <span class="text-red-500">*</span></FormLabel
                >
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="education, finance, healthcare..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Owner -->
            <FormField v-slot="{ componentField }" name="owner">
              <FormItem>
                <FormLabel
                  >ข้อมูลผู้ดูแล <span class="text-red-500">*</span></FormLabel
                >
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="เช่น Data Team, John Doe, Marketing Department"
                  />
                </FormControl>
                <FormDescription>
                  ระบุบุคคลหรือทีมที่เป็นข้อมูลผู้ดูแลชุดข้อมูลนี้
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <Separator />

          <!-- Section: Tags -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Tags class="h-4 w-4" />
              <span>แท็ก</span>
            </div>

            <div class="space-y-2">
              <Label>แท็ก</Label>
              <div class="flex gap-2">
                <Input
                  v-model="newTag"
                  placeholder="เพิ่ม แท็ก..."
                  @keyup.enter.prevent="addTag"
                  class="flex-1"
                />
                <Button
                  @click="addTag"
                  variant="outline"
                  size="sm"
                  type="button"
                  class="cursor-pointer"
                >
                  เพิ่ม
                </Button>
              </div>
              <div
                v-if="values.tags && values.tags.length > 0"
                class="flex flex-wrap gap-1"
              >
                <Badge
                  v-for="tag in values.tags"
                  :key="tag"
                  variant="secondary"
                  class="flex items-center gap-1"
                >
                  {{ tag }}
                  <button
                    @click="removeTag(tag)"
                    class="ml-1 hover:text-destructive cursor-pointer"
                    type="button"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Form Actions -->
      <Separator />
      <div class="flex justify-end gap-3 px-6 py-4 bg-muted/30">
        <Button
          type="button"
          variant="outline"
          @click="closeSheet"
          :disabled="isCreating"
          class="cursor-pointer"
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          form="createชุดข้อมูลForm"
          :disabled="isCreating"
          class="cursor-pointer"
        >
          <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin mr-2" />
          <Database v-else class="h-4 w-4 mr-2" />
          สร้าง ชุดข้อมูล
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
