<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm, Field as VeeField } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { Roles, ApiResponse, UpdateRolesRequest } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

import {
  Loader2,
  ShieldCheck,
  FileText,
  Settings2,
  Pencil,
} from "lucide-vue-next";
import { authApiInstance } from "@/stores/api";
import { ROUTE_NAMES } from "@/lib/constants";

// Reactive data
const isLoading = ref(false);
const isUpdating = ref(false);
const router = useRouter();
const { showError, showSuccess } = useToast();
const showSheet = ref(true);

// Store role ID and name separately
const roleId = ref<string>("");
const roleName = ref<string>("");

// Available scopes options
const scopeOptions = [
  {
    value: "create",
    label: "Create",
    labelTh: "สร้าง",
    description: "สร้างข้อมูลใหม่",
  },
  { value: "get", label: "Get", labelTh: "ดู", description: "ดูข้อมูล" },
  {
    value: "update",
    label: "Update",
    labelTh: "แก้ไข",
    description: "แก้ไขข้อมูล",
  },
  { value: "delete", label: "Delete", labelTh: "ลบ", description: "ลบข้อมูล" },
];

// Form validation schema for role
const roleSchema = toTypedSchema(
  z.object({
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
const { handleSubmit, setValues } = useForm({
  validationSchema: roleSchema,
  initialValues: {
    description: "",
    service: "document",
    scopes: [] as string[],
    is_default: false,
  },
});

// API functions
const getRole = async (id: string): Promise<Roles> => {
  try {
    const response = await authApiInstance.get<ApiResponse<Roles>>(
      `/v1/auth/roles/${id}`,
    );
    if (!response.data.data) {
      throw new Error("ไม่พบข้อมูล Role");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Error fetching role ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล Role ได้";
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ Role ที่ต้องการแก้ไข");
    }
    throw new Error(errorMessage);
  }
};

const loadRole = async () => {
  isLoading.value = true;
  try {
    const response = await getRole(
      router.currentRoute.value.params.roleId as string,
    );
    roleId.value = response.id;
    roleName.value = response.name;
    setValues({
      description: response.description || "",
      service: response.service || "document",
      scopes: response.scopes || [],
      is_default: response.is_default || false,
    });
  } catch (error: any) {
    console.error("Error loading role:", error);
    showError(error.message || "ไม่สามารถโหลดข้อมูล Role ได้");
    closeSheet();
  } finally {
    isLoading.value = false;
  }
};

// API function to update a role
const updateRole = async (data: UpdateRolesRequest) => {
  try {
    const response = await authApiInstance.put<ApiResponse<Roles>>(
      `/v1/auth/roles/${roleId.value}`,
      data,
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating role:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถอัปเดต Role ได้";
    throw new Error(errorMessage);
  }
};

// Handle form submission
const handleUpdateRole = handleSubmit(async (formData) => {
  isUpdating.value = true;
  try {
    const payload: UpdateRolesRequest = {
      description: formData.description,
      service: formData.service,
      scopes: formData.scopes,
      is_default: formData.is_default,
    };

    await updateRole(payload);
    showSuccess(`อัปเดต Role "${roleName.value}" เรียบร้อยแล้ว`);
    router.push({ name: ROUTE_NAMES.ROLES });
  } catch (error: any) {
    console.error("Error updating role:", error);
    showError(error.message || "ไม่สามารถอัปเดต Role ได้");
  } finally {
    isUpdating.value = false;
  }
});

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false;
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.ROLES });
  }, 300);
};

onMounted(() => {
  loadRole();
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
            <Pencil class="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle class="text-xl">
              <template v-if="isLoading">
                <Skeleton class="h-6 w-32" />
              </template>
              <template v-else> แก้ไข {{ roleName }} </template>
            </SheetTitle>
            <SheetDescription>
              <template v-if="isLoading">
                <Skeleton class="h-4 w-48 mt-1" />
              </template>
              <template v-else>
                แก้ไขข้อมูลและสิทธิ์ของ
                <span class="font-semibold">{{ roleName }}</span>
              </template>
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Separator />

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <!-- Loading State -->
        <template v-if="isLoading">
          <div class="space-y-6">
            <div class="space-y-4">
              <Skeleton class="h-4 w-40" />
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
            </div>
            <Separator />
            <div class="space-y-4">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-20 w-full" />
            </div>
            <Separator />
            <div class="space-y-3">
              <Skeleton class="h-4 w-36" />
              <Skeleton class="h-16 w-full" />
              <Skeleton class="h-16 w-full" />
              <Skeleton class="h-16 w-full" />
              <Skeleton class="h-16 w-full" />
            </div>
          </div>
        </template>

        <!-- Form -->
        <form
          v-else
          id="updateRoleForm"
          @submit="handleUpdateRole"
          class="space-y-6"
        >
          <!-- Section: ข้อมูลพื้นฐาน -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <FileText class="h-4 w-4" />
              <span>ข้อมูลพื้นฐาน (Basic Information)</span>
            </div>

            <!-- Role Name (Read-only) -->
            <div class="space-y-2">
              <Label> ชื่อ Role (Role Name) </Label>
              <Input :model-value="roleName" disabled class="bg-muted" />
              <p class="text-sm text-muted-foreground">
                ไม่สามารถเปลี่ยนชื่อ Role ได้
              </p>
            </div>

            <!-- Description -->
            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel>
                  คำอธิบาย (Description) <span class="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="อธิบายหน้าที่และวัตถุประสงค์ของ Role นี้"
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
                  <FormLabel class="text-base">
                    ตั้งเป็นค่าเริ่มต้น (Default Role)
                  </FormLabel>
                  <FormDescription>
                    Role นี้จะถูกกำหนดให้ผู้ใช้ใหม่โดยอัตโนมัติ
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
                  >สิทธิ์การเข้าถึง (Scopes)
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
                        <span class="text-muted-foreground ml-2"
                          >({{ scope.label }})</span
                        >
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
          :disabled="isUpdating || isLoading"
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          form="updateRoleForm"
          :disabled="isUpdating || isLoading"
        >
          <Loader2 v-if="isUpdating" class="h-4 w-4 animate-spin mr-2" />
          <ShieldCheck v-else class="h-4 w-4 mr-2" />
          บันทึกการเปลี่ยนแปลง
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
