<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
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
import type { Dataset, DatasetUpsert, ApiResponse } from "@/types/dataset";

const router = useRouter();
const route = useRoute();
const { showError, showSuccess } = useToast();

// Reactive data
const isUpdating = ref(false);
const isLoading = ref(false);
const newTag = ref("");
const showSheet = ref(true);
const datasetId = ref<string>(route.params.id as string);

// Form validation schema
const datasetSchema = toTypedSchema(
  z.object({
    id: z
      .string()
      .min(1, "กรุณาระบุ ชื่อชุดข้อมูลสำหรับ Api")
      .max(50, "ชื่อชุดข้อมูลสำหรับ Api ต้องไม่เกิน 50 ตัวอักษร")
      .regex(
        /^[a-z0-9_]+$/,
        "ชื่อชุดข้อมูลสำหรับ Api ต้องใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น",
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
      .min(1, "กรุณาระบุ Domain")
      .max(50, "Domain ต้องไม่เกิน 50 ตัวอักษร"),
    owner: z
      .string()
      .min(1, "กรุณาระบุชื่อ Owner")
      .max(100, "ชื่อ Owner ต้องไม่เกิน 100 ตัวอักษร"),
    tags: z.array(z.string()).optional(),
  }),
);

// Form setup
const { handleSubmit, values, setFieldValue, setValues } = useForm({
  validationSchema: datasetSchema,
  initialValues: {
    id: "",
    name: "",
    description: "",
    domain: "",
    owner: "",
    tags: [] as string[],
  },
});

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false;
  // Wait for animation then navigate
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.DATASET });
  }, 300);
};

// API functions
const getDataset = async (id: string): Promise<Dataset> => {
  try {
    const response = await dataApiInstance.get<ApiResponse<Dataset>>(
      `/v1/datasets/${id}`,
    );
    if (!response.data.data) {
      throw new Error("ไม่พบข้อมูล ชุดข้อมูล");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Error fetching dataset ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล ชุดข้อมูล ได้";
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ ชุดข้อมูล ที่ต้องการแก้ไข");
    }
    throw new Error(errorMessage);
  }
};

const updateDataset = async (
  id: string,
  dataset: DatasetUpsert,
): Promise<ApiResponse<any>> => {
  try {
    // API uses POST for both create and update dataset
    const response = await dataApiInstance.post<ApiResponse<any>>(
      `/v1/datasets`,
      dataset,
    );
    return response.data;
  } catch (error: any) {
    console.error(`Error updating dataset ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถอัปเดต ชุดข้อมูล ได้";
    if (error.response?.status === 400) {
      throw new Error(
        "ข้อมูล ชุดข้อมูล ไม่ถูกต้อง โปรดตรวจสอบข้อมูลให้ครบถ้วน",
      );
    }
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ ชุดข้อมูล ที่ต้องการอัปเดต");
    }
    if (error.response?.status === 409) {
      throw new Error("ชื่อชุดข้อมูลสำหรับ Api นี้มีอยู่แล้ว โปรดใช้ชื่ออื่น");
    }
    throw new Error(errorMessage);
  }
};

// Functions
const loadDataset = async () => {
  isLoading.value = true;
  try {
    const dataset = await getDataset(datasetId.value);
    setValues({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description || "",
      domain: dataset.domain || "",
      owner: dataset.owner,
      tags: dataset.tags || [],
    });
  } catch (error: any) {
    console.error("Error loading dataset:", error);
    showError(error.message || "ไม่สามารถโหลดข้อมูล ชุดข้อมูล ได้");
    closeSheet();
  } finally {
    isLoading.value = false;
  }
};

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

const handleUpdateDataset = handleSubmit(async (formData) => {
  isUpdating.value = true;
  try {
    // Add default values for sensitivity and has_pii
    const datasetData = {
      ...formData,
      sensitivity: "public",
      has_pii: false,
    };
    await updateDataset(datasetId.value, datasetData as DatasetUpsert);
    showSuccess(`อัปเดต ชุดข้อมูล "${formData.name}" เรียบร้อยแล้ว`);
    closeSheet();
  } catch (error: any) {
    console.error("Error updating ชุดข้อมูล:", error);
    showError(error.message || "ไม่สามารถอัปเดต ชุดข้อมูล ได้");
  } finally {
    isUpdating.value = false;
  }
});

// Lifecycle
onMounted(() => {
  loadDataset();
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
            <SheetTitle class="text-xl">แก้ไขชุดข้อมูล</SheetTitle>
            <SheetDescription> แก้ไขข้อมูลชุดข้อมูลในระบบ </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Separator />

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="flex-1 flex items-center justify-center py-12"
      >
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Edit Form -->
      <div v-else class="flex-1 overflow-y-auto px-6 py-6">
        <form
          id="editDatasetForm"
          @submit="handleUpdateDataset"
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
            <!-- Dataset ID (Read-only) -->
            <FormField v-slot="{ componentField }" name="id">
              <FormItem>
                <FormLabel>ชื่อชุดข้อมูลสำหรับ Api</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    class="font-mono bg-muted"
                    disabled
                  />
                </FormControl>
                <FormDescription>
                  ชื่อชุดข้อมูลสำหรับ Api ไม่สามารถแก้ไขได้
                </FormDescription>
              </FormItem>
            </FormField>

            <!-- Dataset Name -->
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
                  ระบุบุคคลหรือทีมที่เป็นเจ้าของชุดข้อมูลนี้
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
                    class="ml-1 hover:text-destructive"
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
          :disabled="isUpdating"
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          form="editDatasetForm"
          :disabled="isUpdating || isLoading"
        >
          <Loader2 v-if="isUpdating" class="h-4 w-4 animate-spin mr-2" />
          <Database v-else class="h-4 w-4 mr-2" />
          บันทึกการแก้ไข
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
