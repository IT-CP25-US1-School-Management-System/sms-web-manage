<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm, Field as VeeField } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { Roles, ApiResponse, CreateRolesRequest } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

import { Loader2, ShieldCheck, FileText, Settings2 } from "lucide-vue-next";
import { authApiInstance } from "@/stores/api";
import { ROUTE_NAMES } from "@/lib/constants";

// Reactive data
const isCreating = ref(false);
const router = useRouter();
const { showError, showSuccess } = useToast();
const showSheet = ref(true);

// Available scopes options
const scopeOptions = [
  {
    value: "create",
    label: "Create",
    labelTh: "สร้าง",
    description: "สามารถสร้างข้อมูลใหม่",
  },
  { value: "get", label: "Get", labelTh: "ดู", description: "สามารถดูข้อมูล" },
  {
    value: "update",
    label: "Update",
    labelTh: "แก้ไข",
    description: "สามารถแก้ไขข้อมูล",
  },
  {
    value: "delete",
    label: "Delete",
    labelTh: "ลบ",
    description: "สามารถลบข้อมูล",
  },
];

// Form validation schema for role/Source
const roleSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, "กรุณาระบุชื่อบทบาท"),
    description: z
      .string()
      .min(1, "กรุณาระบุคำอธิบาย")
      .max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
    service: z.string().min(1, "กรุณาเลือก Service"),
    scopes: z.array(z.string()).min(1, "กรุณาเลือกอย่างน้อย 1 สิทธิ์"),
    is_default: z.boolean(),
  }),
);

// Form setup
const { handleSubmit } = useForm({
  validationSchema: roleSchema,
  initialValues: {
    name: "",
    description: "",
    service: "document",
    scopes: [] as string[],
    is_default: false,
  },
});

// API function to create a role
const createRole = async (data: CreateRolesRequest) => {
  try {
    const response = await authApiInstance.post<ApiResponse<Roles>>(
      `/v1/auth/roles`,
      data,
    );
    return response.data;
  } catch (error: any) {
    console.error("Error creating role:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถสร้าง Role ได้";
    throw new Error(errorMessage);
  }
};

// Handle form submission
const handleCreateRole = handleSubmit(async (formData) => {
  isCreating.value = true;
  try {
    const payload: CreateRolesRequest = {
      name: formData.name,
      description: formData.description,
      service: formData.service,
      scopes: formData.scopes,
      is_default: formData.is_default,
    };

    await createRole(payload);
    showSuccess(`สร้าง Role "${formData.name}" เรียบร้อยแล้ว`);
    router.push({ name: ROUTE_NAMES.ROLES });
  } catch (error: any) {
    console.error("Error creating role:", error);
    showError(error.message || "ไม่สามารถสร้าง Role ได้");
  } finally {
    isCreating.value = false;
  }
});

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false;
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.ROLES });
  }, 300);
};
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
            <ShieldCheck class="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle class="text-xl">เพิ่ม Role ใหม่</SheetTitle>
            <SheetDescription>
              กำหนดสิทธิ์การเข้าถึงสำหรับผู้ใช้ในระบบ
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Separator />

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <form id="createRoleForm" @submit="handleCreateRole" class="space-y-6">
          <!-- Section: ข้อมูลพื้นฐาน -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <FileText class="h-4 w-4" />
              <span>ข้อมูลพื้นฐาน</span>
            </div>

            <!-- Name -->
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel>
                  ชื่อบทบาท<span class="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="เช่น document_manager, data_viewer"
                  />
                </FormControl>
                <FormDescription>
                  ใช้ภาษาอังกฤษ ตัวเล็ก และ underscore เท่านั้น
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Description -->
            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel>
                  คำอธิบาย <span class="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="อธิบายหน้าที่และวัตถุประสงค์ของ บทบาท นี้"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <Separator />

          <!-- Section: การตั้งค่า Service -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Settings2 class="h-4 w-4" />
              <span>การตั้งค่า (Settings)</span>
            </div>

            <!-- Service -->
            <FormField v-slot="{ componentField }" name="service">
              <FormItem>
                <FormLabel>
                  Service <span class="text-destructive">*</span>
                </FormLabel>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="document">
                      <div class="flex items-center gap-2">
                        <FileText class="h-4 w-4" />
                        <span>Document</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  เลือก Service ที่ต้องการกำหนดสิทธิ์
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Is Default -->
            <FormField v-slot="{ value, handleChange }" name="is_default">
              <FormItem
                class="flex flex-row items-center justify-between rounded-lg border p-4"
              >
                <div class="space-y-0.5">
                  <FormLabel class="text-base"> ตั้งเป็นค่าเริ่มต้น </FormLabel>
                  <FormDescription>
                    บทบาทนี้จะถูกกำหนดให้ผู้ใช้ใหม่โดยอัตโนมัติ
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    :model-value="value"
                    @update:model-value="handleChange"
                  />
                </FormControl>
              </FormItem>
            </FormField>
          </div>

          <Separator />

          <!-- Section: สิทธิ์การเข้าถึง -->
          <VeeField v-slot="{ field, errors }" name="scopes">
            <FormItem :data-invalid="!!errors.length">
              <div
                class="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3"
              >
                <ShieldCheck class="h-4 w-4" />
                <span
                  >สิทธิ์การเข้าถึง
                  <span class="text-destructive">*</span></span
                >
              </div>

              <div class="space-y-3">
                <div
                  v-for="scope in scopeOptions"
                  :key="scope.value"
                  class="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  :class="{
                    'border-primary bg-primary/5': field.value?.includes(
                      scope.value,
                    ),
                  }"
                >
                  <Checkbox
                    :id="`scope-${scope.value}`"
                    :name="field.name"
                    :model-value="field.value?.includes(scope.value)"
                    @update:model-value="
                      (checked: boolean | 'indeterminate') => {
                        const newValue = checked
                          ? [...(field.value || []), scope.value]
                          : (field.value || []).filter(
                              (value: string) => value !== scope.value,
                            );
                        field.onChange(newValue);
                      }
                    "
                  />
                  <Label
                    :for="`scope-${scope.value}`"
                    class="flex-1 cursor-pointer"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium">{{ scope.labelTh }}</span>
                      </div>
                    </div>
                    <p class="text-sm text-muted-foreground mt-0.5">
                      {{ scope.description }}
                    </p>
                  </Label>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          </VeeField>
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
        >
          ยกเลิก
        </Button>
        <Button type="submit" form="createRoleForm" :disabled="isCreating">
          <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin mr-2" />
          <ShieldCheck v-else class="h-4 w-4 mr-2" />
          สร้าง Role
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
