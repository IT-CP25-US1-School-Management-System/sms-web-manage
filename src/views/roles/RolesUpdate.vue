<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { Roles, ApiResponse, UpdateRolesRequest } from "@/types/roles";
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
const isUpdating = ref(false);
const showPassword = ref(false);
const router = useRouter();
const { showError, showSuccess } = useToast();
const showSheet = ref(true);
const showPasswordField = ref(false);

// Form validation schema for role/Source
const roleSchema = toTypedSchema(
  z.object({
    id: z.string().optional(),
    description: z
      .string()
      .min(1, "กรุณาระบุคำอธิบาย")
      .max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
  })
);

// API functions
const getrole = async (id: string): Promise<Roles> => {
  try {
    const response = await authApiInstance.get<ApiResponse<Roles>>(
      `/v1/auth/roles/${id}`
    );
    if (!response.data.data) {
      throw new Error("ไม่พบข้อมูล role");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Error fetching role ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล role ได้";
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ role ที่ต้องการแก้ไข");
    }
    throw new Error(errorMessage);
  }
};

// Form setup
const { handleSubmit, setValues } = useForm({
  validationSchema: roleSchema,
  initialValues: {
    id: "",
    description: "",
  },
});

// Store role ID separately (not part of form validation)
const roleId = ref<string>("");
const roleName = ref<string>("");

const loadrole = async () => {
  isLoading.value = true;
  console.log(router.currentRoute.value.params.roleId as string);

  try {
    const response = await getrole(
      router.currentRoute.value.params.roleId as string
    );
    // Store ID separately
    roleId.value = response.id;
    roleName.value = response.name;
    // Set form values (without id)
    setValues({
      description: response.description || "",
    });
  } catch (error: any) {
    console.error("Error loading role:", error);
    showError(error.message || "ไม่สามารถโหลดข้อมูล role ได้");
    closeSheet();
  } finally {
    isLoading.value = false;
  }
};

// API function to update a role/source
const updaterole = async (data: UpdateRolesRequest) => {
  try {
    const response = await authApiInstance.put<ApiResponse<Roles>>(
      `/v1/auth/roles/${roleId.value}`,
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
const handleUpdaterole = handleSubmit(async (formData) => {
  isUpdating.value = true;
  try {
    // Prepare payload - remove password if not changing
    const payload: UpdateRolesRequest = {
      description: formData.description,
    };

    await updaterole(payload);
    showSuccess(`อัปเดต Role เรียบร้อยแล้ว`);
    // Navigate back to manage role view
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
  // Wait for animation then navigate
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.ROLES });
  }, 300);
};
onMounted(() => {
  loadrole();
});
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

        <form id="updateRoleForm" @submit="handleUpdaterole" class="grid gap-6">
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
          :disabled="isUpdating"
        >
          ยกเลิก
        </Button>
        <Button type="submit" form="updateRoleForm" :disabled="isUpdating">
          <Loader2 v-if="isUpdating" class="h-4 w-4 animate-spin mr-2" />
          บันทึก
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
