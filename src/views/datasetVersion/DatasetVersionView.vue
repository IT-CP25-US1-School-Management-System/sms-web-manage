<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  HardDrive,
  Tag,
  User,
  FileText,
  Plus,
  MoreHorizontal,
  Eye,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-vue-next";
import { ROUTE_NAMES } from "@/lib/constants";
import { dataApiInstance } from "@/stores/api";
import type {
  Dataset,
  DatasetVersion,
  DatasetVersionSearchResponse,
} from "@/types/dataset";
import { formatDateTime } from "@/lib/helpers";

const route = useRoute();
const router = useRouter();

const datasetId = ref<string>(route.params.id as string);
const dataset = ref<Dataset | null>(null);
const versions = ref<DatasetVersion[]>([]);
const isLoadingDataset = ref(true);
const isLoadingVersions = ref(true);

// Pagination
const paginationData = ref({
  page: 1,
  per_page: 10,
  total_pages: 0,
  total_rows: 0,
});

const { getPaginationInfo, canPreviousPage, canNextPage } =
  usePagination(paginationData);

// Detail sheet
const isDetailOpen = ref(false);
const selectedVersion = ref<DatasetVersion | null>(null);

// Status change confirmation
const showStatusDialog = ref(false);
const versionToChange = ref<DatasetVersion | null>(null);
const isChangingStatus = ref(false);

const goBack = () => {
  router.push({ name: ROUTE_NAMES.DATASET });
};

const loadDataset = async () => {
  try {
    isLoadingDataset.value = true;
    const response = await dataApiInstance.get(
      `/v1/datasets/${datasetId.value}`,
    );
    console.log("Dataset response:", response.data);
    dataset.value = response.data.data;
  } catch (error) {
    console.error("Failed to load dataset:", error);
  } finally {
    isLoadingDataset.value = false;
  }
};

const loadVersions = async () => {
  try {
    isLoadingVersions.value = true;
    const response = await dataApiInstance.get<DatasetVersionSearchResponse>(
      `/v1/datasets/${datasetId.value}/versions`,
      {
        params: {
          page: paginationData.value.page,
          per_page: paginationData.value.per_page,
        },
      },
    );
    versions.value = response.data.data;
    paginationData.value = {
      page: response.data.page,
      per_page: response.data.per_page,
      total_pages: response.data.total_pages,
      total_rows: response.data.total_rows,
    };
  } catch (error) {
    console.error("Failed to load versions:", error);
  } finally {
    isLoadingVersions.value = false;
  }
};

const getStatusColor = (status: string) => {
  const colors = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    deprecated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return colors[status as keyof typeof colors] || "";
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const openDetail = (version: DatasetVersion) => {
  selectedVersion.value = version;
  isDetailOpen.value = true;
};

const closeDetail = () => {
  isDetailOpen.value = false;
  setTimeout(() => {
    selectedVersion.value = null;
  }, 300);
};

const handleStatusChangeClick = (version: DatasetVersion) => {
  versionToChange.value = version;
  showStatusDialog.value = true;
};

const handleStatusChange = async () => {
  if (!versionToChange.value) return;

  const newStatus =
    versionToChange.value.status === "deprecated" ? "active" : "deprecated";

  isChangingStatus.value = true;
  try {
    await dataApiInstance.patch(
      `/v1/datasets/${datasetId.value}/versions/${versionToChange.value.version}`,
      { status: newStatus },
    );
    await loadVersions();
  } catch (error) {
    console.error("Failed to change status:", error);
  } finally {
    isChangingStatus.value = false;
    showStatusDialog.value = false;
    versionToChange.value = null;
  }
};

const goToPage = (page: number) => {
  paginationData.value.page = page;
  loadVersions();
};

const previousPage = () => {
  if (paginationData.value.page > 1) {
    paginationData.value.page--;
    loadVersions();
  }
};

const nextPage = () => {
  if (paginationData.value.page < paginationData.value.total_pages) {
    paginationData.value.page++;
    loadVersions();
  }
};

onMounted(() => {
  loadDataset();
  loadVersions();
});

// Reload data when navigating back to this page
onActivated(() => {
  loadVersions();
});

// Watch for refresh query parameter to reload data after creating new version
watch(
  () => route.query.refresh,
  (newRefresh) => {
    if (newRefresh === "true") {
      loadVersions();
      // Clear the refresh parameter from URL without navigation
      router.replace({
        name: route.name,
        params: route.params,
        query: { ...route.query, refresh: undefined },
      });
    }
  },
);
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          @click="goBack"
          class="flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft class="h-4 w-4" />
          ย้อนกลับ
        </Button>
      </div>

      <!-- Dataset Detail Section -->
      <Card>
        <CardHeader>
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <CardTitle class="flex items-center gap-2">
                <HardDrive class="h-5 w-5" />
                <Skeleton v-if="isLoadingDataset" class="h-8 w-64" />
                <span v-else>{{ dataset?.name || datasetId }}</span>
              </CardTitle>
              <CardDescription>
                <Skeleton v-if="isLoadingDataset" class="h-4 w-96" />
                <span v-else>{{
                  dataset?.description || "ไม่มีคำอธิบาย"
                }}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            v-if="isLoadingDataset"
            class="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Domain -->
            <div class="space-y-1">
              <div
                class="text-sm text-muted-foreground flex items-center gap-1"
              >
                <HardDrive class="h-3 w-3" />
                หมวดหมู่
              </div>
              <Badge v-if="dataset?.domain" variant="outline">{{
                dataset.domain
              }}</Badge>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </div>

            <!-- Owner -->
            <div class="space-y-1">
              <div
                class="text-sm text-muted-foreground flex items-center gap-1"
              >
                <User class="h-3 w-3" />
                ข้อมูลผู้ดูแล
              </div>
              <div class="text-sm font-medium">{{ dataset?.owner || "-" }}</div>
            </div>

            <!-- Tags -->
            <div class="space-y-1">
              <div
                class="text-sm text-muted-foreground flex items-center gap-1"
              >
                <Tag class="h-3 w-3" />
                แท็ก
              </div>
              <div
                class="flex flex-wrap gap-1"
                v-if="dataset?.tags && dataset.tags.length > 0"
              >
                <Badge
                  v-for="tag in dataset.tags"
                  :key="tag"
                  variant="secondary"
                  class="text-xs"
                >
                  {{ tag }}
                </Badge>
              </div>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Versions Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                <FileText class="h-5 w-5" />
                Version ของชุดข้อมูล
                <Badge
                  v-if="!isLoadingVersions"
                  variant="secondary"
                  class="ml-2"
                >
                  {{ paginationData.total_rows }} version
                </Badge>
              </CardTitle>
              <CardDescription>
                รายการ version ทั้งหมดของชุดข้อมูลนี้
              </CardDescription>
            </div>
            <Button
              size="sm"
              class="flex items-center gap-2 cursor-pointer"
              @click="
                router.push({
                  name: ROUTE_NAMES.DATASET_VERSION_CREATE,
                  params: { id: datasetId },
                })
              "
            >
              <Plus class="h-4 w-4" />
              สร้าง Version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="isLoadingVersions" class="space-y-2">
            <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
          </div>

          <div
            v-else-if="versions.length === 0"
            class="text-center py-8 text-muted-foreground"
          >
            ไม่พบข้อมูล Version
          </div>

          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>ID ของฐานข้อมูล</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
                <TableHead class="text-center">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="version in versions"
                :key="version.version"
                class="cursor-pointer hover:bg-muted/50"
                @click="openDetail(version)"
              >
                <TableCell>
                  <div class="font-medium">{{ version.version }}</div>
                </TableCell>
                <TableCell>
                  <code class="text-xs bg-muted px-1 py-0.5 rounded">{{
                    version.source_id
                  }}</code>
                </TableCell>
                <TableCell>
                  <Badge
                    :class="getStatusColor(version.status)"
                    variant="secondary"
                    class="capitalize"
                  >
                    {{
                      version.status === "deprecated"
                        ? "ปิดการใช้งาน"
                        : "เปิดใช้งาน"
                    }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span class="text-sm">{{
                    formatDateTime(version.created_at)
                  }}</span>
                </TableCell>
                <TableCell class="text-center" @click.stop>
                  <div class="flex items-center justify-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-8 w-8 p-0 cursor-pointer"
                          :disabled="isChangingStatus"
                        >
                          <Loader2
                            v-if="isChangingStatus"
                            class="h-4 w-4 animate-spin"
                          />
                          <MoreHorizontal v-else class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          @click="openDetail(version)"
                          class="cursor-pointer"
                        >
                          <Eye class="h-4 w-4 mr-2" />
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click="handleStatusChangeClick(version)"
                          :class="
                            version.status === 'deprecated'
                              ? 'text-green-600 focus:text-green-600 cursor-pointer'
                              : 'text-destructive focus:text-destructive cursor-pointer'
                          "
                        >
                          <CheckCircle
                            v-if="version.status === 'deprecated'"
                            class="h-4 w-4 mr-2"
                          />
                          <XCircle v-else class="h-4 w-4 mr-2" />
                          {{
                            version.status === "deprecated"
                              ? "เปิดใช้งาน"
                              : "ปิดการใช้งาน"
                          }}
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

    <!-- Status Change Confirmation Dialog -->
    <AlertDialog v-model:open="showStatusDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>เปลี่ยนสถานะ Version?</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการเปลี่ยนสถานะของ version
            <strong>{{ versionToChange?.version }}</strong> เป็น
            <strong>{{
              versionToChange?.status === "deprecated"
                ? "เปิดใช้งาน"
                : "ปิดการใช้งาน"
            }}</strong>
            หรือไม่? การดำเนินการนี้สามารถเปลี่ยนกลับได้ในภายหลัง
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            @click="handleStatusChange"
            :disabled="isChangingStatus"
          >
            <Loader2
              v-if="isChangingStatus"
              class="mr-2 h-4 w-4 animate-spin"
            />
            ยืนยัน
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Detail Sheet -->
    <Sheet
      v-model:open="isDetailOpen"
      @update:open="(open) => !open && closeDetail()"
    >
      <SheetContent class="w-full sm:max-w-4xl overflow-y-auto p-6">
        <SheetHeader class="space-y-3 pb-4">
          <SheetTitle class="flex items-center justify-between">
            <span>Version {{ selectedVersion?.version }}</span>
            <Button
              v-if="selectedVersion"
              size="sm"
              @click="
                $router.push({
                  name: ROUTE_NAMES.DATASET_VERSION_SERVING,
                  params: { id: datasetId, version: selectedVersion.version },
                })
              "
            >
              View Data
            </Button>
          </SheetTitle>
          <SheetDescription>
            รายละเอียดของ Version ของชุดข้อมูล
          </SheetDescription>
        </SheetHeader>

        <div v-if="selectedVersion" class="mt-6 space-y-6 pb-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">ข้อมูลพื้นฐาน</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-muted-foreground">Version</div>
                <div class="font-medium">{{ selectedVersion.version }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground">สถานะ</div>
                <Badge
                  :class="getStatusColor(selectedVersion.status)"
                  variant="secondary"
                >
                  {{
                    selectedVersion.status == "deprecated"
                      ? "ปิดการใช้งาน"
                      : "เปิดใช้งาน"
                  }}
                </Badge>
              </div>
              <div class="col-span-2">
                <div class="text-sm text-muted-foreground">ID ของฐานข้อมูล</div>
                <code class="text-xs bg-muted px-2 py-1 rounded">{{
                  selectedVersion.source_id
                }}</code>
              </div>
            </div>
          </div>

          <!-- Schema -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Schema</h3>
            <div class="border rounded-lg p-4 bg-muted/20">
              <div class="text-sm text-muted-foreground mb-3">
                Columns ({{ selectedVersion.schema?.columns?.length || 0 }})
              </div>
              <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
                <div
                  v-for="(col, i) in selectedVersion.schema?.columns"
                  :key="i"
                  class="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                >
                  <div>
                    <span class="font-mono font-medium">{{ col.name }}</span>
                    <span class="text-muted-foreground ml-2"
                      >({{ col.table_name }})</span
                    >
                  </div>
                  <Badge variant="outline" class="text-xs">{{
                    col.type
                  }}</Badge>
                </div>
              </div>
            </div>
          </div>

          <!-- Access Policies -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">การเข้าถึง</h3>
            <div class="space-y-3">
              <div
                v-for="(policy, i) in selectedVersion.access_policies"
                :key="i"
                class="border rounded-lg p-4 bg-muted/20"
              >
                <div class="flex items-center gap-2 mb-2">
                  <Badge variant="default">{{ policy.role }}</Badge>
                  <Badge variant="outline">{{ policy.scope }}</Badge>
                </div>
                <div class="text-sm space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-muted-foreground">สิทธิ์:</span>
                    <Badge
                      v-if="policy.can_view"
                      variant="secondary"
                      class="text-xs"
                      >View</Badge
                    >
                    <Badge
                      v-if="policy.can_edit"
                      variant="secondary"
                      class="text-xs"
                      >Edit</Badge
                    >
                    <Badge
                      v-if="policy.can_delete"
                      variant="secondary"
                      class="text-xs"
                      >Delete</Badge
                    >
                  </div>
                  <div v-if="policy.allow_view?.length > 0">
                    <span class="text-muted-foreground">View:</span>
                    <span class="ml-2">{{ policy.allow_view.join(", ") }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Runtime Policies -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Runtime</h3>
            <div class="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div>
                <div class="text-sm text-muted-foreground">View เริ่มต้น</div>
                <div class="font-medium">
                  {{ selectedVersion.policies?.runtime?.default_view || "-" }}
                </div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground">
                  Key Field สำหรับค้นหา
                </div>
                <div class="font-medium">
                  {{ selectedVersion.policies?.runtime?.key_field || "-" }}
                </div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground">
                  ตารางหลักของ View
                </div>
                <div class="font-medium">
                  {{
                    selectedVersion.policies?.runtime?.query?.from?.table || "-"
                  }}
                </div>
              </div>
              <div
                v-if="
                  selectedVersion.policies?.runtime?.query?.joins?.length > 0
                "
              >
                <div class="text-sm text-muted-foreground mb-2">
                  การเชื่อมตาราง ({{
                    selectedVersion.policies.runtime.query.joins.length
                  }})
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(join, i) in selectedVersion.policies.runtime.query
                      .joins"
                    :key="i"
                    class="text-sm bg-muted p-2 rounded"
                  >
                    <code class="text-xs"
                      >{{ join.table_from }} → {{ join.table_to }}</code
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Views -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Views</h3>
            <div class="space-y-3">
              <div
                v-for="(tables, viewName) in selectedVersion.policies?.views"
                :key="viewName"
                class="border rounded-lg p-4 bg-muted/20"
              >
                <div class="font-medium mb-3">{{ viewName }}</div>
                <div class="space-y-2">
                  <div
                    v-for="(table, i) in tables"
                    :key="i"
                    class="text-sm bg-muted p-3 rounded"
                  >
                    <div class="font-mono">{{ table.table_name }}</div>
                    <div class="text-xs text-muted-foreground">
                      Columns: {{ table.columns?.join(", ") || "ไม่มี" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="space-y-4 pt-4 border-t">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-muted-foreground">วันที่สร้าง</div>
                <div>{{ formatDateTime(selectedVersion.created_at) }}</div>
              </div>
              <div>
                <div class="text-muted-foreground">วันที่แก้ไข</div>
                <div>{{ formatDateTime(selectedVersion.updated_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <!-- Child Routes (Create/Edit Modal) -->
    <RouterView />
  </MainLayout>
</template>
