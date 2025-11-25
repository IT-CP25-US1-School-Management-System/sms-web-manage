<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "@/composables/useToast";
import { usePagination } from "@/composables/usePagination";

import MainLayout from "@/layouts/MainLayout.vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTE_NAMES } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { authApiInstance } from "@/stores/api";

import {
  Search,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
} from "lucide-vue-next";

import { useRouter, useRoute } from "vue-router";
import type {
  Users,
  UsersSearchParams,
  UsersSearchResponse,
} from "@/types/users";
import AssignRoleModal from "@/views/users/AssignRoleModal.vue";
const router = useRouter();
const route = useRoute();
// Reactive data
const users = ref<Users[]>([]);
const searchQuery = ref("");
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const searchTimeout = ref<number | null>(null);
const showDeleteDialog = ref(false);
const usersToDelete = ref<Users | null>(null);
const showToggleDialog = ref(false);
const usersToToggle = ref<Users | null>(null);
const showAssignRoleDialog = ref(false);
const selectedUser = ref<Users | null>(null);
const isAssigningRole = ref(false);

const paginationData = ref({
  page: 1,
  per_page: 10,
  total_pages: 0,
  total_rows: 0,
});

const { showError, showSuccess } = useToast();
const { getPaginationInfo, canPreviousPage, canNextPage } =
  usePagination(paginationData);

// Lifecycle
onMounted(() => {
  loadUsers();
});

// API functions
const getuserss = async (
  params?: UsersSearchParams
): Promise<UsersSearchResponse> => {
  try {
    const response = await authApiInstance.get<UsersSearchResponse>(
      "/v1/auth/users",
      {
        params,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching datasets:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    throw new Error(errorMessage);
  }
};

// Functions
const loadUsers = async (params?: UsersSearchParams) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const searchParams: UsersSearchParams = {
      page: paginationData.value.page,
      per_page: paginationData.value.per_page,
      ...params,
    };

    if (searchQuery.value.trim()) {
      searchParams.search_word = searchQuery.value.trim();
    }

    const response: UsersSearchResponse = await getuserss(searchParams);

    users.value = response.data;
    paginationData.value = {
      page: response.page,
      per_page: response.per_page,
      total_pages: response.total_pages,
      total_rows: response.total_rows,
    };
  } catch (error: any) {
    console.error("Error loading datasets:", error);
    errorMessage.value = error.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    showError(error.message || "ไม่สามารถโหลดข้อมูล datasets ได้");
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => {
  paginationData.value.page = 1;
  loadUsers();
};

const debouncedSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(() => {
    handleSearch();
  }, 500);
};

const handleAssignRoleConfirm = async (data: {
  addRoleIds: string[];
  removeRoleIds: string[];
}) => {
  if (!selectedUser.value) return;

  // เก็บข้อมูล user ไว้ก่อน เพราะ selectedUser อาจถูก clear ระหว่างทำงาน
  const currentUser = selectedUser.value;
  isAssigningRole.value = true;

  try {
    // API calls for add and remove roles
    const promises = [];

    if (data.addRoleIds.length > 0) {
      promises.push(
        authApiInstance.post(`/v1/auth/users/roles/assign`, {
          keycloak_id: currentUser.keycloak_id,
          role_ids: data.addRoleIds,
        })
      );
    }

    if (data.removeRoleIds.length > 0) {
      promises.push(
        authApiInstance.post(`/v1/auth/users/roles/remove`, {
          keycloak_id: currentUser.keycloak_id,
          role_ids: data.removeRoleIds,
        })
      );
    }

    await Promise.all(promises);

    showSuccess(
      `อัปเดต roles สำหรับ ${currentUser.first_name} ${currentUser.last_name} เรียบร้อยแล้ว`
    );
    showAssignRoleDialog.value = false;
    selectedUser.value = null; // Clear หลัง success
    await loadUsers();
  } catch (error: any) {
    console.error("Error assigning roles:", error);
    showError(error.response?.data?.message || "ไม่สามารถอัปเดต roles ได้");
  } finally {
    isAssigningRole.value = false;
  }
};

const assignRole = async (user: Users) => {
  selectedUser.value = user;
  console.log("Assigning roles to user:", user);

  // await loadAvailableRoles();
  showAssignRoleDialog.value = true;
};

const handleAssignRoleCancel = () => {
  showAssignRoleDialog.value = false;
  selectedUser.value = null; // Clear เมื่อ cancel
};

const viewUserDetail = (user: Users) => {
  router.push({
    name: ROUTE_NAMES.USER_DETAIL,
    state: { user: JSON.parse(JSON.stringify(user)) }, // แปลงเป็น plain object
  });
};

const goToPage = (page: number) => {
  paginationData.value.page = page;
  loadUsers();
};

const previousPage = () => {
  if (paginationData.value.page > 1) {
    paginationData.value.page--;
    loadUsers();
  }
};

const nextPage = () => {
  if (paginationData.value.page < paginationData.value.total_pages) {
    paginationData.value.page++;
    loadUsers();
  }
};

// Watchers
watch(searchQuery, () => {
  debouncedSearch();
});

// Watch dialog close to clear data
watch(showDeleteDialog, (newValue) => {
  if (!newValue) {
    setTimeout(() => {
      usersToDelete.value = null;
    }, 300); // รอให้ animation ปิด dialog เสร็จก่อน
  }
});

watch(showToggleDialog, (newValue) => {
  if (!newValue) {
    setTimeout(() => {
      usersToToggle.value = null;
    }, 300); // รอให้ animation ปิด dialog เสร็จก่อน
  }
});

// Watch route changes to reload data when returning from create/edit
watch(
  () => route.name,
  (newName, oldName) => {
    // Reload when returning to dataset list from create/edit
    if (
      newName === ROUTE_NAMES.USERS &&
      oldName === ROUTE_NAMES.USERS_ASSIGN_ROLES
    ) {
      loadUsers();
    }
  }
);
</script>

<template>
  <MainLayout>
    <div v-if="route.name === ROUTE_NAMES.USERS" class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Users</h1>
          <p class="text-muted-foreground mt-2">
            จัดการสิทธิ์และดูข้อมูลผู้ใช้งานต่าง ๆ
          </p>
        </div>
        <router-link :to="{ name: ROUTE_NAMES.ROLES }">
          <Button class="flex items-center gap-2 cursor-pointer">
            จัดการ Role
          </Button>
        </router-link>
      </div>

      <!-- Search and Filter -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <div class="relative flex-1">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="searchQuery"
                placeholder="ค้นหา dataset..."
                class="pl-10"
                @keyup.enter="handleSearch"
              />
            </div>
            <Button
              @click="handleSearch"
              :disabled="isLoading"
              class="cursor-pointer"
            >
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ค้นหา
            </Button>
            <Button
              v-if="searchQuery"
              @click="
                searchQuery = '';
                handleSearch();
              "
              variant="outline"
            >
              ล้าง
            </Button>
          </div>
        </CardHeader>
      </Card>

      <!-- Datasets Table -->
      <Card>
        <CardHeader>
          <CardTitle>รายการ users</CardTitle>
          <CardDescription>
            จัดการและดูรายละเอียดฐานข้อมูลทั้งหมด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Loading state -->
          <div v-if="isLoading" class="space-y-4">
            <div class="space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/4" />
            </div>
          </div>

          <!-- Error state -->
          <div
            v-else-if="errorMessage"
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <AlertCircle class="h-12 w-12 text-destructive mb-4" />
            <h3 class="text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h3>
            <p class="text-muted-foreground mb-4">{{ errorMessage }}</p>
            <Button @click="loadUsers()" variant="outline">
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ลองใหม่
            </Button>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="users.length === 0"
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <AlertCircle class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">ไม่พบ users</h3>
            <p class="text-muted-foreground mb-4">
              {{
                searchQuery
                  ? "ไม่พบ users ที่ตรงกับการค้นหา"
                  : "ยังไม่มี users ในระบบ"
              }}
            </p>
            <Button variant="outline">
              <Plus class="h-4 w-4 mr-2" />
              สร้าง users แรก
            </Button>
          </div>

          <!-- Data table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-60">full name</TableHead>
                <TableHead class="w-30">email</TableHead>
                <TableHead class="w-30">roles</TableHead>
                <TableHead class="w-30"> แก้ไข role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="user in users"
                :key="user.keycloak_id"
                class="hover:bg-accent/50 cursor-pointer"
                @click="viewUserDetail(user)"
              >
                <TableCell class="w-80">
                  <div class="flex items-center gap-2">
                    <FileText class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div class="font-medium">
                        {{ user.first_name }} {{ user.last_name }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="w-30">
                  <Badge v-if="user.email" variant="outline">{{
                    user.email
                  }}</Badge>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>

                <TableCell>
                  <div
                    class="flex flex-wrap gap-1"
                    v-if="user.roles && user.roles.length > 0"
                  >
                    <Badge
                      v-for="role in user.roles.slice(0, 2)"
                      :key="role.id"
                      variant="secondary"
                      class="text-xs"
                    >
                      {{ role.name }}
                    </Badge>
                    <Badge
                      v-if="user.roles.length > 2"
                      variant="secondary"
                      class="text-xs"
                    >
                      +{{ user.roles.length - 2 }}
                    </Badge>
                  </div>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>

                <TableCell class="w-[30px]">
                  <div class="flex items-start justify-start gap-2">
                    <Badge
                      @click.stop="assignRole(user)"
                      class="cursor-pointer"
                    >
                      <Edit class="mr-2 h-4 w-4" />
                      แก้ไข
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Pagination -->
          <div
            v-if="paginationData.total_pages > 1"
            class="flex items-center justify-between mt-4"
          >
            <div class="text-sm text-muted-foreground">
              {{ getPaginationInfo.text }}
            </div>

            <div class="ml-auto">
              <Pagination
                v-slot="{ page }"
                :items-per-page="paginationData.per_page"
                :total="paginationData.total_rows"
                :default-page="paginationData.page"
                :sibling-count="1"
                :show-edges="true"
                @update:page="goToPage"
              >
                <PaginationContent v-slot="{ items }" class="gap-2">
                  <PaginationPrevious
                    :disabled="!canPreviousPage"
                    @click="previousPage"
                  >
                    ก่อนหน้า
                  </PaginationPrevious>

                  <template v-for="(item, index) in items" :key="index">
                    <PaginationItem
                      v-if="item.type === 'page'"
                      :value="item.value"
                      :is-active="item.value === page"
                      @click="goToPage(item.value)"
                    >
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis
                      v-else-if="item.type === 'ellipsis'"
                      :index="index"
                    />
                  </template>

                  <PaginationNext :disabled="!canNextPage" @click="nextPage">
                    ถัดไป
                  </PaginationNext>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Assign Role Modal -->
    <AssignRoleModal
      v-model:open="showAssignRoleDialog"
      :user="selectedUser"
      :is-loading="isAssigningRole"
      @confirm="handleAssignRoleConfirm"
      @cancel="handleAssignRoleCancel"
    />

    <!-- Child Routes -->
    <RouterView />
  </MainLayout>
</template>

<style scoped></style>
