<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { usePagination } from '@/composables/usePagination'
import MainLayout from '@/layouts/MainLayout.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, FileText, Loader2, AlertCircle, Trash2, Plus, MoreHorizontal, Edit } from 'lucide-vue-next'
import { dataApiInstance } from '@/stores/api'
import { ROUTE_NAMES } from '@/lib/constants'
import type { Dataset, DatasetSearchParams, DatasetSearchResponse, ApiResponse } from '@/types/dataset'

const router = useRouter()
const route = useRoute()

// Reactive data
const datasets = ref<Dataset[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const isDeleting = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const showDeleteDialog = ref(false)
const datasetToDelete = ref<Dataset | null>(null)

const paginationData = ref({
  page: 1,
  per_page: 10,
  total_pages: 0,
  total_rows: 0
})

const { showError, showSuccess } = useToast()
const { getPaginationInfo, canPreviousPage, canNextPage } = usePagination(paginationData)

// API functions
const getDatasets = async (params?: DatasetSearchParams): Promise<DatasetSearchResponse> => {
  try {
    const response = await dataApiInstance.get<DatasetSearchResponse>("/v1/datasets", {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching datasets:', error);
    const errorMessage = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูล datasets ได้';
    throw new Error(errorMessage);
  }
}

const deleteDataset = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await dataApiInstance.delete<ApiResponse<any>>(`/v1/datasets/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error deleting dataset ${id}:`, error);
    const errorMessage = error.response?.data?.message || 'ไม่สามารถลบ dataset ได้';
    if (error.response?.status === 404) {
      throw new Error('ไม่พบ dataset ที่ต้องการลบ');
    }
    if (error.response?.status === 403) {
      throw new Error('คุณไม่มีสิทธิ์ในการลบ dataset นี้');
    }
    throw new Error(errorMessage);
  }
}

// Computed properties

// Functions
const loadDatasets = async (params?: DatasetSearchParams) => {
  isLoading.value = true
  errorMessage.value = null
  
  try {
    const searchParams: DatasetSearchParams = {
      page: paginationData.value.page,
      per_page: paginationData.value.per_page,
      ...params
    }

    if (searchQuery.value.trim()) {
      searchParams.search_word = searchQuery.value.trim()
    }

    const response: DatasetSearchResponse = await getDatasets(searchParams)
    
    datasets.value = response.data
    paginationData.value = {
      page: response.page,
      per_page: response.per_page,
      total_pages: response.total_pages,
      total_rows: response.total_rows
    }
  } catch (error: any) {
    console.error('Error loading datasets:', error)
    errorMessage.value = error.message || 'ไม่สามารถโหลดข้อมูล datasets ได้'
    showError(error.message || 'ไม่สามารถโหลดข้อมูล datasets ได้')
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  paginationData.value.page = 1
  loadDatasets()
}



const goToEditDataset = (dataset: Dataset) => {
  router.push({ name: ROUTE_NAMES.DATASET_EDIT, params: { id: dataset.id } })
}

const goToDatasetVersion = (dataset: Dataset) => {
  router.push({ name: ROUTE_NAMES.DATASET_VERSION, params: { id: dataset.id } })
}

const handleDeleteClick = (dataset: Dataset) => {
  datasetToDelete.value = dataset
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!datasetToDelete.value) return

  isDeleting.value = datasetToDelete.value.id
  try {
    await deleteDataset(datasetToDelete.value.id)
    showSuccess(`ลบ dataset "${datasetToDelete.value.name}" เรียบร้อยแล้ว`)
    await loadDatasets()
  } catch (error) {
    console.error('Error deleting dataset:', error)
    showError('ไม่สามารถลบ dataset ได้')
  } finally {
    isDeleting.value = null
    showDeleteDialog.value = false
    datasetToDelete.value = null
  }
}

const goToCreateDataset = () => {
  router.push({ name: ROUTE_NAMES.DATASET_CREATE })
}



const goToPage = (page: number) => {
  paginationData.value.page = page
  loadDatasets()
}

const previousPage = () => {
  if (paginationData.value.page > 1) {
    paginationData.value.page--
    loadDatasets()
  }
}

const nextPage = () => {
  if (paginationData.value.page < paginationData.value.total_pages) {
    paginationData.value.page++
    loadDatasets()
  }
}

// Watchers

// Watch route changes to reload data when returning from create/edit
watch(() => route.name, (newName, oldName) => {
  // Reload when returning to dataset list from create/edit
  if (newName === ROUTE_NAMES.DATASET && (oldName === ROUTE_NAMES.DATASET_CREATE || oldName === ROUTE_NAMES.DATASET_EDIT)) {
    loadDatasets()
  }
})

// Lifecycle
onMounted(() => {
  loadDatasets()
})
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Dataset</h1>
          <p class="text-muted-foreground mt-2">
            จัดการและดูข้อมูลชุดข้อมูลต่าง ๆ ของระบบ
          </p>
        </div>
        <Button @click="goToCreateDataset" class="flex items-center gap-2 cursor-pointer">
          <Plus class="h-4 w-4" />
          สร้าง Dataset ใหม่
        </Button>
      </div>

      <!-- Search and Filter -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              @click="searchQuery = ''; handleSearch()" 
              variant="outline"
              class="cursor-pointer"
            >
              ล้าง
            </Button>
          </div>
        </CardHeader>
      </Card>



      <!-- Datasets Table -->
      <Card>
        <CardHeader>
          <CardTitle>รายการ Dataset</CardTitle>
          <CardDescription>
            จัดการและดูรายละเอียดชุดข้อมูลทั้งหมด
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
          <div v-else-if="errorMessage" class="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle class="h-12 w-12 text-destructive mb-4" />
            <h3 class="text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h3>
            <p class="text-muted-foreground mb-4">{{ errorMessage }}</p>
            <Button @click="loadDatasets()" variant="outline" class="cursor-pointer">
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ลองใหม่
            </Button>
          </div>

          <!-- Empty state -->
          <div v-else-if="datasets.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">ไม่พบ Dataset</h3>
            <p class="text-muted-foreground mb-4">
              {{ searchQuery ? 'ไม่พบ dataset ที่ตรงกับการค้นหา' : 'ยังไม่มี dataset ในระบบ' }}
            </p>
            <Button @click="goToCreateDataset" variant="outline" class="cursor-pointer">
              <Plus class="h-4 w-4 mr-2" />
              สร้าง Dataset แรก
            </Button>
          </div>

          <!-- Data table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ Dataset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="dataset in datasets" 
                :key="dataset.id" 
                class="hover:bg-muted/50 transition-colors"
              >
                <TableCell 
                  @click="goToDatasetVersion(dataset)"
                  class="cursor-pointer"
                >
                  <div class="flex items-center gap-2">
                    <FileText class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div class="font-medium">{{ dataset.name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ dataset.description || 'ไม่มีคำอธิบาย' }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge v-if="dataset.domain" variant="outline">{{ dataset.domain }}</Badge>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1" v-if="dataset.tags && dataset.tags.length > 0">
                    <Badge v-for="tag in dataset.tags.slice(0, 2)" :key="tag" variant="secondary" class="text-xs">
                      {{ tag }}
                    </Badge>
                    <Badge v-if="dataset.tags.length > 2" variant="secondary" class="text-xs">
                      +{{ dataset.tags.length - 2 }}
                    </Badge>
                  </div>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  <span class="text-sm">{{ dataset.owner }}</span>
                </TableCell>
                <TableCell class="text-right" @click.stop>
                  <div class="flex items-center justify-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-8 w-8 p-0 cursor-pointer"
                          :disabled="isDeleting === dataset.id"
                        >
                          <Loader2 v-if="isDeleting === dataset.id" class="h-4 w-4 animate-spin" />
                          <MoreHorizontal v-else class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="goToDatasetVersion(dataset)" class="cursor-pointer">
                          <FileText class="mr-2 h-4 w-4" />
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="goToEditDataset(dataset)" class="cursor-pointer">
                          <Edit class="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          @click="handleDeleteClick(dataset)" 
                          class="text-destructive focus:text-destructive cursor-pointer"
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
          <div v-if="paginationData.total_pages > 1" class="flex items-center justify-between mt-4">
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
                
                <PaginationNext 
                  :disabled="!canNextPage" 
                  @click="nextPage"
                >
                  ถัดไป
                </PaginationNext>
              </PaginationContent>
            </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Nested Route View for Modal Routing -->
    <router-view />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบ Dataset</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการลบ dataset "<strong>{{ datasetToDelete?.name }}</strong>" หรือไม่?
            <br><br>
            การดำเนินการนี้ไม่สามารถยกเลิกได้ และข้อมูลจะถูกลบออกจากระบบถาวร
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction 
            @click="handleDelete"
            :disabled="isDeleting !== null"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Loader2 v-if="isDeleting !== null" class="h-4 w-4 animate-spin mr-2" />
            ลบ Dataset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </MainLayout>
</template>
