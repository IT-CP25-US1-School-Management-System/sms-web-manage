<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { ROUTE_NAMES } from "@/lib/constants";

import MainLayout from "@/layouts/MainLayout.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Search, RefreshCw, Eye } from "lucide-vue-next";

import type { PathResponse, SearchResourceItem, SearchResourcesRequest } from "@/types/document";
import { formatFileSize, listPaths, searchResources } from "@/stores/document";

const router = useRouter();
const { showError } = useToast();

const isLoading = ref(false);
const isLoadingPaths = ref(false);
const resources = ref<SearchResourceItem[]>([]);
const paths = ref<PathResponse[]>([]);

const query = ref("");
const selectedPathId = ref("all");
const selectedStatus = ref("all");
const sortBy = ref<"created_at" | "size" | "filename">("created_at");
const sortOrder = ref<"asc" | "desc">("desc");

const page = ref(1);
const perPage = ref(10);
const totalRows = ref(0);
const totalPages = ref(1);

const canSearch = computed(() => query.value.trim().length >= 2);

const search = async () => {
  if (!canSearch.value) {
    resources.value = [];
    totalRows.value = 0;
    totalPages.value = 1;
    return;
  }

  isLoading.value = true;
  try {
    const params: SearchResourcesRequest = {
      q: query.value.trim(),
      page: page.value,
      limit: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    };

    if (selectedPathId.value !== "all") {
      params.path_id = selectedPathId.value;
    }

    if (selectedStatus.value !== "all") {
      params.status = selectedStatus.value as SearchResourcesRequest["status"];
    }

    const response = await searchResources(params);
    resources.value = response.data;
    totalRows.value = response.total_rows;
    totalPages.value = response.total_pages;
    perPage.value = response.per_page;
  } catch (error: any) {
    showError(error.response?.data?.error?.message || "ไม่สามารถค้นหาไฟล์ได้");
  } finally {
    isLoading.value = false;
  }
};

const loadPaths = async () => {
  isLoadingPaths.value = true;
  try {
    paths.value = await listPaths();
  } catch {
    // no-op
  } finally {
    isLoadingPaths.value = false;
  }
};

const goBack = () => {
  router.push({ name: ROUTE_NAMES.DOCUMENTS });
};

const viewDetail = (resource: SearchResourceItem) => {
  router.push({
    name: ROUTE_NAMES.DOCUMENTS_DETAIL,
    params: { resourceId: resource.resource_id },
    query: {
      pathId: resource.folder?.path?.id,
      folderId: resource.folder?.id,
      pathName: resource.folder?.path?.name,
      folderName: resource.folder?.folder,
      fileName: resource.original_filename,
    },
  });
};

const goPrev = () => {
  if (page.value <= 1) return;
  page.value -= 1;
};

const goNext = () => {
  if (page.value >= totalPages.value) return;
  page.value += 1;
};

const applyFilters = () => {
  if (page.value !== 1) {
    page.value = 1;
    return;
  }
  search();
};

watch(page, () => {
  search();
});

onMounted(() => {
  loadPaths();
});
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-4 p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="icon" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
          </Button>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">ค้นหาไฟล์ทั้งหมด</h1>
            <p class="text-muted-foreground">ค้นหาข้ามทุก Path และ Folder</p>
          </div>
        </div>
        <Button variant="outline" @click="search" :disabled="!canSearch || isLoading">
          <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          ค้นหาใหม่
        </Button>
      </div>

      <Card>
        <CardContent class="p-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative min-w-[280px] flex-1">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="query"
                class="pl-9"
                placeholder="ค้นหาไฟล์... (อย่างน้อย 2 ตัวอักษร)"
                @keydown.enter="applyFilters"
              />
            </div>

            <Select v-model="selectedPathId" :disabled="isLoadingPaths">
              <SelectTrigger class="w-[170px]"><SelectValue placeholder="Path" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Path: ทั้งหมด</SelectItem>
                <SelectItem v-for="path in paths" :key="path.id" :value="path.id">
                  {{ path.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="selectedStatus">
              <SelectTrigger class="w-[160px]"><SelectValue placeholder="สถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
                <SelectItem value="PENDING">รอตรวจสอบ</SelectItem>
                <SelectItem value="APPROVED">อนุมัติ</SelectItem>
                <SelectItem value="REJECTED">ปฏิเสธ</SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="sortBy">
              <SelectTrigger class="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">วันที่สร้าง</SelectItem>
                <SelectItem value="filename">ชื่อไฟล์</SelectItem>
                <SelectItem value="size">ขนาดไฟล์</SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="sortOrder">
              <SelectTrigger class="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">ใหม่ไปเก่า</SelectItem>
                <SelectItem value="asc">เก่าไปใหม่</SelectItem>
              </SelectContent>
            </Select>

            <Select v-model="perPage" @update:model-value="applyFilters">
              <SelectTrigger class="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="10">10 / หน้า</SelectItem>
                <SelectItem :value="20">20 / หน้า</SelectItem>
                <SelectItem :value="50">50 / หน้า</SelectItem>
              </SelectContent>
            </Select>

            <Button @click="applyFilters" :disabled="isLoading || !canSearch">
              <Search class="mr-2 h-4 w-4" />
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="min-h-[180px] p-0">
          <div v-if="!canSearch" class="flex min-h-[180px] items-center justify-center p-8 text-center text-muted-foreground">
            กรุณาพิมพ์คำค้นหาอย่างน้อย 2 ตัวอักษร
          </div>

          <div v-else-if="isLoading" class="flex min-h-[180px] items-center justify-center p-8">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

          <div v-else-if="resources.length === 0" class="flex min-h-[180px] items-center justify-center p-8 text-center text-muted-foreground">
            ไม่พบไฟล์ที่ตรงกับเงื่อนไข
          </div>

          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อไฟล์</TableHead>
                <TableHead>Path / Folder</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ขนาด</TableHead>
                <TableHead>วันที่อัปโหลด</TableHead>
                <TableHead class="w-[140px] text-right">การทำงาน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in resources" :key="item.resource_id">
                <TableCell class="font-medium max-w-[420px]">
                  <span class="truncate block">{{ item.original_filename }}</span>
                </TableCell>
                <TableCell>
                  <div class="text-sm">
                    <div>{{ item.folder?.path?.name || "-" }}</div>
                    <div class="text-muted-foreground">{{ item.folder?.folder || "-" }}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" class="font-mono text-xs">{{ item.content_type }}</Badge>
                </TableCell>
                <TableCell>{{ formatFileSize(item.size) }}</TableCell>
                <TableCell>{{ new Date(item.created_at).toLocaleDateString("th-TH") }}</TableCell>
                <TableCell class="text-right">
                  <Button variant="outline" size="sm" @click="viewDetail(item)">
                    <Eye class="mr-1 h-4 w-4" />ดูรายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div v-if="canSearch && totalRows > 0" class="flex items-center justify-between border-t px-4 py-3">
            <p class="text-sm text-muted-foreground">ทั้งหมด {{ totalRows }} รายการ</p>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="sm" :disabled="page <= 1" @click="goPrev">ก่อนหน้า</Button>
              <span class="text-sm text-muted-foreground">หน้า {{ page }} / {{ totalPages }}</span>
              <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="goNext">ถัดไป</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </MainLayout>
</template>
