<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "@/composables/useToast";
import { usePagination } from "@/composables/usePagination";

import MainLayout from "@/layouts/MainLayout.vue";
import { Switch } from "@/components/ui/switch";
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

import { dataApiInstance } from "@/stores/api";
import type { ApiResponse } from "@/types/dataset";
import type {
  Database,
  DatabaseSearchResponse,
  DatabaseSearchParams,
} from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  FileText,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  MoreHorizontal,
  Edit,
} from "lucide-vue-next";

import { useRouter, useRoute } from "vue-router";
import ConfirmModel from "../../components/introspaction/ConfirmModel.vue";
const router = useRouter();
const route = useRoute();
// Reactive data
const database = ref<Database[]>([]);
const searchQuery = ref("");
const isLoading = ref(false);
const isDeleting = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const searchTimeout = ref<number | null>(null);
const showDeleteDialog = ref(false);
const databaseToDelete = ref<Database | null>(null);
const showToggleDialog = ref(false);
const databaseToToggle = ref<Database | null>(null);
const newActiveState = ref<boolean>(false);

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
  loadDatasets();
});

// API functions
const getDatabases = async (
  params?: DatabaseSearchParams
): Promise<DatabaseSearchResponse> => {
  try {
    const response = await dataApiInstance.get<DatabaseSearchResponse>(
      "/v1/introspect/sources",
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

const deleteDatabase = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await dataApiInstance.delete<ApiResponse<any>>(
      `/v1/introspect/sources/${id}`
    );
    return response.data;
  } catch (error: any) {
    console.error(`Error deleting dataset ${id}:`, error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถลบ dataset ได้";
    if (error.response?.status === 404) {
      throw new Error("ไม่พบ dataset ที่ต้องการลบ");
    }
    if (error.response?.status === 403) {
      throw new Error("คุณไม่มีสิทธิ์ในการลบ dataset นี้");
    }
    throw new Error(errorMessage);
  }
};

const updateIsActive = async (source_id: string, active: string) => {
  try {
    const response = await dataApiInstance.patch(
      `/v1/introspect/sources/${source_id}/${active}`
    );
    return response;
  } catch (error: any) {
    console.error("Error creating database:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถสร้าง Database ได้";
    throw new Error(errorMessage);
  }
};
// Computed properties

// Functions
const loadDatasets = async (params?: DatabaseSearchParams) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const searchParams: DatabaseSearchParams = {
      page: paginationData.value.page,
      per_page: paginationData.value.per_page,
      ...params,
    };

    if (searchQuery.value.trim()) {
      searchParams.search_word = searchQuery.value.trim();
    }

    const response: DatabaseSearchResponse = await getDatabases(searchParams);

    database.value = response.data;
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
  loadDatasets();
};

const debouncedSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(() => {
    handleSearch();
  }, 500);
};

const handleDeleteClick = (database: Database) => {
  databaseToDelete.value = database;
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!databaseToDelete.value) return;

  isDeleting.value = databaseToDelete.value.id;
  try {
    await deleteDatabase(databaseToDelete.value.id);
    showSuccess(`ลบ dataset "${databaseToDelete.value.name}" เรียบร้อยแล้ว`);
    await loadDatasets();
    showDeleteDialog.value = false;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    showError("ไม่สามารถลบ dataset ได้");
  } finally {
    isDeleting.value = null;
    databaseToDelete.value = null;
  }
};

const goToEditDatabase = (database: Database) => {
  router.push({
    name: ROUTE_NAMES.MANAGE_DATABASE_UPDATE,
    params: { id: database.id },
  });
};

const goToPage = (page: number) => {
  paginationData.value.page = page;
  loadDatasets();
};

const previousPage = () => {
  if (paginationData.value.page > 1) {
    paginationData.value.page--;
    loadDatasets();
  }
};

const nextPage = () => {
  if (paginationData.value.page < paginationData.value.total_pages) {
    paginationData.value.page++;
    loadDatasets();
  }
};

const handleToggleClick = (source: Database) => {
  databaseToToggle.value = source;
  newActiveState.value = !source.is_active;
  showToggleDialog.value = true;
};

const isToggling = ref(false);

const handleToggleConfirm = async () => {
  if (!databaseToToggle.value) return;

  const state = databaseToToggle.value.is_active ? "deactivate" : "activate";
  isToggling.value = true;

  try {
    const response = await updateIsActive(databaseToToggle.value.id, state);
    console.log(response);

    if (response.status === 200) {
      showSuccess(`เปลี่ยนสถานะการใช้งานเรียบร้อยแล้ว`);
      await loadDatasets();
      showToggleDialog.value = false;
    } else {
      showError("ไม่สามารถเปลี่ยนสถานะการใช้งานได้");
    }
  } catch (error) {
    console.error("Error toggling database status:", error);
    showError("ไม่สามารถเปลี่ยนสถานะการใช้งานได้");
  } finally {
    isToggling.value = false;
    databaseToToggle.value = null;
  }
};

const handleToggleCancel = () => {
  // ไม่ต้อง clear ค่าที่นี่ เพราะ dialog ยังต้องใช้แสดงข้อมูล
  // จะ clear หลังจาก dialog ปิดแล้วใน watch หรือ onOpenChange
  setTimeout(() => {
    databaseToToggle.value = null;
  }, 300); // รอให้ dialog ปิดก่อน
};

const handleDeleteCancel = () => {
  setTimeout(() => {
    databaseToDelete.value = null;
  }, 300); // รอให้ dialog ปิดก่อน
};

// Watchers
watch(searchQuery, () => {
  debouncedSearch();
});

// Watch dialog close to clear data
watch(showDeleteDialog, (newValue) => {
  if (!newValue) {
    setTimeout(() => {
      databaseToDelete.value = null;
    }, 300); // รอให้ animation ปิด dialog เสร็จก่อน
  }
});

watch(showToggleDialog, (newValue) => {
  if (!newValue) {
    setTimeout(() => {
      databaseToToggle.value = null;
    }, 300); // รอให้ animation ปิด dialog เสร็จก่อน
  }
});

// Watch route changes to reload data when returning from create/edit
watch(
  () => route.name,
  (newName, oldName) => {
    // Reload when returning to dataset list from create/edit
    if (
      newName === ROUTE_NAMES.MANAGE_DATABASE &&
      (oldName === ROUTE_NAMES.MANAGE_DATABASE_CREATE ||
        oldName === ROUTE_NAMES.MANAGE_DATABASE_UPDATE)
    ) {
      loadDatasets();
    }
  }
);
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Database</h1>
          <p class="text-muted-foreground mt-2">
            จัดการและดูข้อมูล ฐานข้อมูลที ต่าง ๆ
          </p>
        </div>
        <router-link :to="{ name: ROUTE_NAMES.MANAGE_DATABASE_CREATE }">
          <Button class="flex items-center gap-2 cursor-pointer">
            <Plus class="h-4 w-4" />
            สร้าง Database ใหม่
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
            <Button @click="handleSearch" :disabled="isLoading" class="cursor-pointer">
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
          <CardTitle>รายการ Database</CardTitle>
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
            <Button @click="loadDatasets()" variant="outline">
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ลองใหม่
            </Button>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="database.length === 0"
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <AlertCircle class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">ไม่พบ Database</h3>
            <p class="text-muted-foreground mb-4">
              {{
                searchQuery
                  ? "ไม่พบ database ที่ตรงกับการค้นหา"
                  : "ยังไม่มี database ในระบบ"
              }}
            </p>
            <Button variant="outline">
              <Plus class="h-4 w-4 mr-2" />
              สร้าง Database แรก
            </Button>
          </div>

          <!-- Data table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-60">ชื่อ Database</TableHead>
                <TableHead class="w-30">Type</TableHead>
                <TableHead class="w-30">DB Type</TableHead>
                <TableHead class="w-30">เปิดใช้งาน</TableHead>
                <TableHead class="w-20">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="source in database"
                :key="source.id"
                @click="
                  router.push({
                    name: ROUTE_NAMES.MANAGE_DATABASE_WITH_ID,
                    params: { sourceId: source.id },
                  })
                "
                class="cursor-pointer hover:bg-accent/50"
              >
                <TableCell class="w-80">
                  <div class="flex items-center gap-2">
                    <FileText class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div class="font-medium">{{ source.name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ source.description || "ไม่มีคำอธิบาย" }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="w-30">
                  <Badge v-if="source.type" variant="outline">{{
                    source.type
                  }}</Badge>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>

                <TableCell class="w-30">
                  <span class="text-sm">{{ source.db_type }}</span>
                </TableCell>
                <TableCell class="w-30">
                  <div class="flex flex-wrap gap-1">
                    <Switch
                      :id="'dataset-active' + source.id"
                      :model-value="source.is_active"
                      :data-state="source.is_active ? 'checked' : 'unchecked'"
                      @click.stop="handleToggleClick(source)"
                    />
                  </div>
                </TableCell>

                <TableCell class="w-[30px]">
                  <div class="flex items-start justify-start gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-8 w-8 p-0"
                          :disabled="isDeleting === source.id"
                          @click.stop
                        >
                          <Loader2
                            v-if="isDeleting === source.id"
                            class="h-4 w-4 animate-spin"
                          />
                          <MoreHorizontal v-else class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="goToEditDatabase(source)">
                          <Edit class="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click.stop="handleDeleteClick(source)"
                          :disabled="isDeleting === source.id"
                          class="text-destructive focus:text-destructive"
                        >
                          <Trash2 class="mr-2 h-4 w-4" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

    <!-- Delete Confirmation Dialog -->
    <ConfirmModel
      v-model:open="showDeleteDialog"
      title="ยืนยันการลบ Database"
      :description="`คุณต้องการลบ database &quot;<strong>${databaseToDelete?.name}</strong>&quot; หรือไม่? <br /><br />การดำเนินการนี้ไม่สามารถยกเลิกได้ และข้อมูลจะถูกลบออกจากระบบถาวร`"
      confirm-text="ลบ"
      cancel-text="ยกเลิก"
      variant="destructive"
      :is-loading="isDeleting !== null"
      @confirm="handleDelete"
      @cancel="handleDeleteCancel"
    />

    <!-- Toggle Status Confirmation Dialog -->
    <ConfirmModel
      v-model:open="showToggleDialog"
      title="ยืนยันการเปลี่ยนสถานะ"
      :description="`คุณต้องการ <strong>${
        newActiveState ? 'เปิด' : 'ปิด'
      }</strong> ใช้งาน database &quot;<strong>${
        databaseToToggle?.name
      }</strong>&quot; หรือไม่?`"
      confirm-text="ตกลง"
      cancel-text="ยกเลิก"
      :is-loading="isToggling"
      @confirm="handleToggleConfirm"
      @cancel="handleToggleCancel"
    />
  </MainLayout>

  <RouterView />
</template>

<style scoped></style>
