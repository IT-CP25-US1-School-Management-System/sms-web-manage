<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { Roles, ApiResponse, CreateRolesRequest } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Loader2 } from "lucide-vue-next";
import { authApiInstance } from "@/stores/api";
import { ROUTE_NAMES } from "@/lib/constants";

// Reactive data
const isLoading = ref(false);
const isCreating = ref(false);
const showPassword = ref(false);
const router = useRouter();
const { showError, showSuccess } = useToast();
const showSheet = ref(true);
const showPasswordField = ref(false);

// Form validation schema for role/Source
const roleSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, "กรุณาระบุชื่อ Role"),
    description: z
      .string()
      .min(1, "กรุณาระบุคำอธิบาย")
      .max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
  })
);

// Form setup
const { handleSubmit, setValues } = useForm({
  validationSchema: roleSchema,
  initialValues: {
    name: "",
    description: "",
  },
});

// Store role ID separately (not part of form validation)
const roleName = ref<string>("");

// API function to update a role/source
const createrole = async (data: CreateRolesRequest) => {
  try {
    const response = await authApiInstance.post<ApiResponse<Roles>>(
      `/v1/auth/roles`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating role:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถอัปเดต role ได้";
    throw new Error(errorMessage);
  }
};

// Handle form submission
const handlecreaterole = handleSubmit(async (formData) => {
  isCreating.value = true;
  try {
    // Prepare payload - remove password if not changing
    const payload: CreateRolesRequest = {
      name: formData.name,
      description: formData.description,
    };

    await createrole(payload);
    showSuccess(`สร้าง Role เรียบร้อยแล้ว`);
    // Navigate back to manage role view
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
  // Wait for animation then navigate
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
      class="sm:max-w-md max-w-sm p-0 overflow-hidden flex flex-col"
    >
      <SheetHeader class="px-6 pt-6">
        <SheetTitle>แก้ไข Role</SheetTitle>
        <SheetDescription>
          แก้ไขข้อมูล role {{ roleName }} ในระบบ
        </SheetDescription>
      </SheetHeader>
      <div class="flex-1 overflow-y-auto px-6 py-6">
        <!-- Form Card -->

        <form id="createRoleForm" @submit="handlecreaterole" class="grid gap-6">
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel
                >ชื่อ Role <span class="text-destructive">*</span></FormLabel
              >
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น dms_data_test2"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <!-- Description -->
          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>คำอธิบาย *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="อธิบายเกี่ยวกับ Role นี้..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </div>
      <!-- Form Actions -->
      <div class="flex justify-end gap-2 px-6 py-4 bg-background border-t">
        <Button
          type="button"
          variant="outline"
          @click="router.back()"
          :disabled="isCreating"
        >
          ยกเลิก
        </Button>
        <Button type="submit" form="createRoleForm" :disabled="isCreating">
          <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin mr-2" />
          บันทึก
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
