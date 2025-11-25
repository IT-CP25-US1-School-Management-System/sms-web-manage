<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, X, Plus } from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import type { Roles } from "@/types/roles";
import type { Users } from "@/types/users";
import { authApiInstance } from "@/stores/api";
import { useToast } from "@/composables/useToast";

interface Props {
  open: boolean;
  user: Users | null;
  isLoading?: boolean;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "confirm", data: { addRoleIds: string[]; removeRoleIds: string[] }): void;
  (e: "cancel"): void;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<Emits>();

const currentRoleIds = ref<string[]>([]);
const addRoleIds = ref<string[]>([]);
const removeRoleIds = ref<string[]>([]);
const availableRoles = ref<Roles[]>([]);
const { showError } = useToast();

// Computed properties
const currentRoles = computed(() => {
  return availableRoles.value.filter(
    (role) =>
      currentRoleIds.value.includes(role.id) &&
      !removeRoleIds.value.includes(role.id)
  );
});

const newRoles = computed(() => {
  return availableRoles.value.filter((role) =>
    addRoleIds.value.includes(role.id)
  );
});

const availableToAdd = computed(() => {
  return availableRoles.value.filter(
    (role) =>
      !currentRoleIds.value.includes(role.id) &&
      !addRoleIds.value.includes(role.id)
  );
});

const hasChanges = computed(() => {
  return addRoleIds.value.length > 0 || removeRoleIds.value.length > 0;
});

// Initialize selected roles when user changes
watch(
  () => props.user,
  (newUser) => {
    if (newUser && newUser.roles) {
      currentRoleIds.value = newUser.roles.map((role) => role.id);
      addRoleIds.value = [];
      removeRoleIds.value = [];
    } else {
      currentRoleIds.value = [];
      addRoleIds.value = [];
      removeRoleIds.value = [];
    }
  },
  { immediate: true }
);

const handleOpenChange = (value: boolean) => {
  emit("update:open", value);
};

const handleCancel = () => {
  addRoleIds.value = [];
  removeRoleIds.value = [];
  emit("update:open", false);
  emit("cancel");
};

const handleConfirm = () => {
  emit("confirm", {
    addRoleIds: addRoleIds.value,
    removeRoleIds: removeRoleIds.value,
  });
};

const addRole = (roleId: string) => {
  if (!addRoleIds.value.includes(roleId)) {
    addRoleIds.value.push(roleId);
  }
};

const removeAddedRole = (roleId: string) => {
  const index = addRoleIds.value.indexOf(roleId);
  if (index > -1) {
    addRoleIds.value.splice(index, 1);
  }
};

const markForRemoval = (roleId: string) => {
  if (!removeRoleIds.value.includes(roleId)) {
    removeRoleIds.value.push(roleId);
  }
};

const undoRemoval = (roleId: string) => {
  const index = removeRoleIds.value.indexOf(roleId);
  if (index > -1) {
    removeRoleIds.value.splice(index, 1);
  }
};

// Load available roles
const loadAvailableRoles = async () => {
  try {
    const response = await authApiInstance.get<{ data: Roles[] }>(
      "/v1/auth/roles",
      {
        params: { per_page: 100 },
      }
    );
    availableRoles.value = response.data.data;
  } catch (error: any) {
    console.error("Error loading roles:", error);
    showError(error.response?.data?.message || "ไม่สามารถโหลดข้อมูล roles ได้");
  }
};

onMounted(() => {
  loadAvailableRoles();
});
</script>

<template>
  <AlertDialog :open="open" @update:open="handleOpenChange">
    <AlertDialogContent class="max-w-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>จัดการ Roles</AlertDialogTitle>
        <AlertDialogDescription>
          <span v-if="user">
            จัดการ roles สำหรับ
            <strong>{{ user.first_name }} {{ user.last_name }}</strong> ({{
              user.email
            }})
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="py-4 space-y-4">
        <!-- Current Roles Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">Roles ปัจจุบัน</h3>
            <Badge variant="secondary">{{ currentRoles.length }} roles</Badge>
          </div>
          <div
            v-if="currentRoles.length === 0 && removeRoleIds.length === 0"
            class="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md"
          >
            ยังไม่มี roles
          </div>
          <div v-else class="space-y-2 max-h-[200px] overflow-y-auto">
            <div
              v-for="role in currentRoles"
              :key="role.id"
              class="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50"
            >
              <div class="flex-1">
                <div class="text-sm font-medium">{{ role.name }}</div>
                <p
                  v-if="role.description"
                  class="text-xs text-muted-foreground mt-1"
                >
                  {{ role.description }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="markForRemoval(role.id)"
                class="ml-2"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Roles to Add Section -->
        <div v-if="newRoles.length > 0">
          <div class="flex items-center justify-between mb-2">
            <h3
              class="text-sm font-semibold text-green-600 dark:text-green-400"
            >
            เพิ่ม Roles
            </h3>
            <!-- <Badge variant="default" class="bg-green-600"
              >+{{ newRoles.length }}</Badge
            > -->
          </div>
          <div class="space-y-2 max-h-[150px] overflow-y-auto">
            <div
              v-for="role in newRoles"
              :key="role.id"
              class="flex items-center justify-between p-3 rounded-md border border-green-500 bg-green-50 dark:bg-green-950/20"
            >
              <div class="flex-1">
                <div class="text-sm font-medium">{{ role.name }}</div>
                <p
                  v-if="role.description"
                  class="text-xs text-muted-foreground mt-1"
                >
                  {{ role.description }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="removeAddedRole(role.id)"
                class="ml-2"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator class="my-3" />
        </div>

        <!-- Roles to Remove Section -->
        <div v-if="removeRoleIds.length > 0">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-red-600 dark:text-red-400">
              ลบ Roles
            </h3>
            <!-- <Badge variant="destructive">-{{ removeRoleIds.length }}</Badge> -->
          </div>
          <div class="space-y-2 max-h-[150px] overflow-y-auto">
            <div
              v-for="roleId in removeRoleIds"
              :key="roleId"
              class="flex items-center justify-between p-3 rounded-md border border-red-500 bg-red-50 dark:bg-red-950/20"
            >
              <div class="flex-1">
                <div class="text-sm font-medium">
                  {{
                    availableRoles.find((r) => r.id === roleId)?.name ||
                    "Unknown Role"
                  }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                  {{
                    availableRoles.find((r) => r.id === roleId)?.description ||
                    ""
                  }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="undoRemoval(roleId)"
                class="ml-2"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator class="my-3" />
        </div>

        <!-- Available Roles to Add -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">เพิ่ม Roles</h3>
            <Badge variant="outline"
              >{{ availableToAdd.length }} available</Badge
            >
          </div>
          <div
            v-if="availableToAdd.length === 0"
            class="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md"
          >
            ไม่มี roles ที่สามารถเพิ่มได้
          </div>
          <div v-else class="space-y-2 max-h-[200px] overflow-y-auto">
            <div
              v-for="role in availableToAdd"
              :key="role.id"
              class="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50 cursor-pointer"
              @click="addRole(role.id)"
            >
              <div class="flex-1">
                <div class="text-sm font-medium">{{ role.name }}</div>
                <p
                  v-if="role.description"
                  class="text-xs text-muted-foreground mt-1"
                >
                  {{ role.description }}
                </p>
              </div>
              <Button variant="ghost" size="sm" class="ml-2">
                <Plus class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel" :disabled="props.isLoading">
          ยกเลิก
        </AlertDialogCancel>
        <AlertDialogAction
          @click="handleConfirm"
          :disabled="props.isLoading || !hasChanges"
        >
          <Loader2 v-if="props.isLoading" class="h-4 w-4 animate-spin mr-2" />
          บันทึกการเปลี่ยนแปลง
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
