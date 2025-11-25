<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useForm } from "vee-validate";
import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type {
  Database,
  ApiResponse,
  UpdateDatabaseRequest,
} from "@/types/database";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, Eye, EyeOff } from "lucide-vue-next";
import { dataApiInstance } from "@/stores/api";
import { DATASET_SENSITIVITY } from "@/lib/constants";
import { ROUTE_NAMES } from "@/lib/constants";

// Reactive data
const isLoading = ref(false);
const isUpdating = ref(false);
const showPassword = ref(false);
const router = useRouter();
const { showError, showSuccess } = useToast();
const showSheet = ref(true);
const showPasswordField = ref(false);

// Form validation schema for Database/Source
const databaseSchema = toTypedSchema(
  z.object({
    id: z.string().optional(),
    name: z
      .string()
      .min(1, "กรุณาระบุชื่อ Database")
      .max(100, "ชื่อ Database ต้องไม่เกิน 100 ตัวอักษร"),
    description: z
      .string()
      .min(1, "กรุณาระบุคำอธิบาย")
      .max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
    type: z.string().min(1, "กรุณาระบุ Type"),
    is_active: z.boolean(),
    db_type: z.string().min(1, "กรุณาระบุ Database Type"),
    host: z.string().min(1, "กรุณาระบุ Host"),
    port: z.number().min(1, "Port ต้องมากกว่า 0"),
    sensitivity: z.enum([
      DATASET_SENSITIVITY.PUBLIC,
      DATASET_SENSITIVITY.INTERNAL,
      DATASET_SENSITIVITY.CONFIDENTIAL,
      DATASET_SENSITIVITY.RESTRICTED,
    ]),
    username: z.string().min(1, "กรุณาระบุ Username"),
    password: z.string().optional(),
    database_name: z.string().min(1),
    params: z.string().optional(),
  })
);

// API functions
const getDatabase = async (id: string): Promise<Database> => {
  try {
    const response = await dataApiInstance.get<ApiResponse<Database>>(
      `/v1/introspect/sources/${id}`
    );
    if (!response.data.data) {
      throw new Error("ไม่พบข้อมูล database");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Error fetching database ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล database ได้";
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ database ที่ต้องการแก้ไข");
    }
    throw new Error(errorMessage);
  }
};

// Form setup
const { handleSubmit, setValues } = useForm({
  validationSchema: databaseSchema,
  initialValues: {
    id: "",
    name: "",
    description: "",
    type: "jdbc",
    is_active: true,
    db_type: "postgres",
    host: "",
    port: 5432,
    sensitivity: DATASET_SENSITIVITY.INTERNAL,
    username: "",
    password: "",
    database_name: "",
    params: "",
  },
});

// Store database ID separately (not part of form validation)
const databaseId = ref<string>("");

const loadDatabase = async () => {
  isLoading.value = true;
  try {
    const response = await getDatabase(
      router.currentRoute.value.params.id as string
    );
    // Store ID separately
    databaseId.value = response.id;
    // Set form values (without id)
    setValues({
      id: response.id,
      name: response.name,
      description: response.description || "",
      type: response.type || "",
      is_active: response.is_active,
      db_type: response.db_type || "postgres",
      host: response.host || "",
      port: response.port,
      sensitivity: response.sensitivity || DATASET_SENSITIVITY.INTERNAL,
      username: response.username || "",
      password: "", // Don't populate password for security
      database_name: response.database_name || "",
      params: response.params || "",
    });
  } catch (error: any) {
    console.error("Error loading database:", error);
    showError(error.message || "ไม่สามารถโหลดข้อมูล database ได้");
    closeSheet();
  } finally {
    isLoading.value = false;
  }
};

// API function to update a database/source
const updateDatabase = async (data: UpdateDatabaseRequest) => {
  try {
    const response = await dataApiInstance.put<ApiResponse<Database>>(
      `/v1/introspect/sources/${databaseId.value}`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating database:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถอัปเดต Database ได้";
    throw new Error(errorMessage);
  }
};

// Handle form submission
const handleUpdateDatabase = handleSubmit(async (formData) => {
  isUpdating.value = true;
  try {
    // Prepare payload - remove password if not changing
    const payload: UpdateDatabaseRequest = {
      id: databaseId.value,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      is_active: formData.is_active,
      db_type: formData.db_type,
      host: formData.host,
      port: formData.port,
      sensitivity: formData.sensitivity,
      username: formData.username,
      database_name: formData.database_name,
      params: formData.params,
      is_update_password: false,
    };

    // Only include password if changing
    if (showPasswordField.value && formData.password) {
      payload.password = formData.password;
      payload.is_update_password = true;
    }

    await updateDatabase(payload);
    showSuccess(`อัปเดต Database "${formData.name}" เรียบร้อยแล้ว`);
    // Navigate back to manage database view
    router.push({ name: ROUTE_NAMES.MANAGE_DATABASE });
  } catch (error: any) {
    console.error("Error updating database:", error);
    showError(error.message || "ไม่สามารถอัปเดต Database ได้");
  } finally {
    isUpdating.value = false;
  }
});

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false;
  // Wait for animation then navigate
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.MANAGE_DATABASE });
  }, 300);
};
onMounted(() => {
  loadDatabase();
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
        <SheetTitle>แก้ไข Database ใหม่</SheetTitle>
        <SheetDescription> แก้ไขข้อมูล database ใหม่ในระบบ </SheetDescription>
      </SheetHeader>
      <div class="flex-1 overflow-y-auto px-6 py-6">
        <!-- Form Card -->

        <form
          id="updateDatabaseForm"
          @submit="handleUpdateDatabase"
          class="grid gap-6"
        >
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>ชื่อ Database *</FormLabel>
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
                  placeholder="อธิบายเกี่ยวกับ Database นี้..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Type -->
          <FormField v-slot="{ componentField }" name="type">
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="เช่น jdbc" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Is Active -->
          <FormField v-slot="{ value, handleChange }" name="is_active">
            <FormItem>
              <FormLabel>Active Status *</FormLabel>
              <FormControl>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_active"
                      :checked="value === true"
                      @change="handleChange(true)"
                      class="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span>Yes</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_active"
                      :checked="value === false"
                      @change="handleChange(false)"
                      class="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span>No</span>
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Database Type -->
          <FormField v-slot="{ componentField }" name="db_type">
            <FormItem>
              <FormLabel>Database Type *</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="เช่น postgres" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Host -->
          <FormField v-slot="{ componentField }" name="host">
            <FormItem>
              <FormLabel>Host *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น postgres หรือ localhost"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Port -->
          <FormField v-slot="{ componentField }" name="port">
            <FormItem>
              <FormLabel>Port *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="number"
                  placeholder="5432"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Sensitivity -->
          <FormField v-slot="{ componentField }" name="sensitivity">
            <FormItem>
              <FormLabel>Sensitivity Level *</FormLabel>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก Sensitivity Level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem :value="DATASET_SENSITIVITY.PUBLIC"
                    >สาธารณะ (Public)</SelectItem
                  >
                  <SelectItem :value="DATASET_SENSITIVITY.INTERNAL"
                    >ภายใน (Internal)</SelectItem
                  >
                  <SelectItem :value="DATASET_SENSITIVITY.CONFIDENTIAL"
                    >ความลับ (Confidential)</SelectItem
                  >
                  <SelectItem :value="DATASET_SENSITIVITY.RESTRICTED"
                    >จำกัด (Restricted)</SelectItem
                  >
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Username -->
          <FormField v-slot="{ componentField }" name="username">
            <FormItem>
              <FormLabel>Username *</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="เช่น root" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Change Password Toggle -->
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                :checked="showPasswordField"
                @change="
                  () => {
                    showPasswordField = !showPasswordField;
                    if (!showPasswordField) showPassword = false;
                  }
                "
                class="w-4 h-4 text-primary border-gray-300 focus:ring-primary rounded"
              />
              <span>ต้องการเปลี่ยนรหัสผ่าน</span>
            </label>
          </div>

          <!-- Password -->
          <FormField
            v-slot="{ componentField }"
            name="password"
            v-if="showPasswordField"
          >
            <FormItem>
              <FormLabel>New Password *</FormLabel>
              <FormControl>
                <div class="relative">
                  <Input
                    v-bind="componentField"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="กรอกรหัสผ่าน"
                    class="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    @click="showPassword = !showPassword"
                  >
                    <Eye
                      v-if="!showPassword"
                      class="h-4 w-4 text-muted-foreground"
                    />
                    <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Database Name -->
          <FormField v-slot="{ componentField }" name="database_name">
            <FormItem>
              <FormLabel>Database Name *</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="เช่น dms_data" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Params (Optional) -->
          <FormField v-slot="{ componentField }" name="params">
            <FormItem>
              <FormLabel>Parameters (Optional)</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น key=value&key2=value2"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </div>

      <!-- Form Actions - Outside scroll area -->
      <div class="flex justify-end gap-2 px-6 py-4 bg-background border-t">
        <Button
          type="button"
          variant="outline"
          @click="router.back()"
          :disabled="isUpdating"
        >
          ยกเลิก
        </Button>
        <Button type="submit" form="updateDatabaseForm" :disabled="isUpdating">
          <Loader2 v-if="isUpdating" class="h-4 w-4 animate-spin mr-2" />
          บันทึก
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
