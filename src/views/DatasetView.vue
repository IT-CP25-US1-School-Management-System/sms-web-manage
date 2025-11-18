<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { usePagination } from '@/composables/usePagination'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Search, FileText, Loader2, AlertCircle, Trash2, Plus, X } from 'lucide-vue-next'
import { dataApiInstance } from '@/stores/api'
import { DATASET_SENSITIVITY } from '@/lib/constants'
import type { Dataset, DatasetSearchParams, DatasetSearchResponse, ApiResponse, DatasetUpsert } from '@/types/dataset'

// Reactive data
const datasets = ref<Dataset[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const isDeleting = ref<string | null>(null)
const isCreating = ref(false)
const errorMessage = ref<string | null>(null)
const searchTimeout = ref<number | null>(null)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const datasetToDelete = ref<Dataset | null>(null)

// Form validation schema
const datasetSchema = toTypedSchema(z.object({
  id: z.string().min(1, 'กรุณาระบุ Dataset ID').max(50, 'Dataset ID ต้องไม่เกิน 50 ตัวอักษร').regex(/^[a-z0-9_]+$/, 'Dataset ID ต้องใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น'),
  name: z.string().min(1, 'กรุณาระบุชื่อ Dataset').max(100, 'ชื่อ Dataset ต้องไม่เกิน 100 ตัวอักษร'),
  description: z.string().min(1, 'กรุณาระบุคำอธิบาย Dataset').max(500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร'),
  domain: z.string().min(1, 'กรุณาระบุ Domain').max(50, 'Domain ต้องไม่เกิน 50 ตัวอักษร'),
  owner: z.string().min(1, 'กรุณาระบุชื่อ Owner').max(100, 'ชื่อ Owner ต้องไม่เกิน 100 ตัวอักษร'),
  tags: z.array(z.string()).optional(),
  has_pii: z.boolean(),
  sensitivity: z.enum([DATASET_SENSITIVITY.PUBLIC, DATASET_SENSITIVITY.INTERNAL, DATASET_SENSITIVITY.CONFIDENTIAL, DATASET_SENSITIVITY.RESTRICTED])
}))

// Form setup
const { handleSubmit, resetForm: resetVeeForm, values, setFieldValue } = useForm({
  validationSchema: datasetSchema,
  initialValues: {
    id: '',
    name: '',
    description: '',
    domain: '',
    owner: '',
    tags: [] as string[],
    has_pii: false,
    sensitivity: DATASET_SENSITIVITY.PUBLIC
  }
})

const newTag = ref('')

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

const createDataset = async (dataset: DatasetUpsert): Promise<ApiResponse<any>> => {
  try {
    const response = await dataApiInstance.post<ApiResponse<any>>("/v1/datasets", dataset);
    return response.data;
  } catch (error: any) {
    console.error('Error creating dataset:', error);
    const errorMessage = error.response?.data?.message || 'ไม่สามารถสร้าง dataset ได้';
    if (error.response?.status === 400) {
      throw new Error('ข้อมูล dataset ไม่ถูกต้อง โปรดตรวจสอบข้อมูลให้ครบถ้วน');
    }
    if (error.response?.status === 409) {
      throw new Error('Dataset ID นี้มีอยู่แล้ว โปรดใช้ ID อื่น');
    }
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

const debouncedSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(() => {
    handleSearch()
  }, 500)
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

//Function for reset form add new dataset
const resetForm = () => {
  resetVeeForm()
  newTag.value = ''
}

const addTag = () => {
  if (newTag.value.trim() && !values.tags?.includes(newTag.value.trim())) {
    const currentTags = values.tags || []
    setFieldValue('tags', [...currentTags, newTag.value.trim()])
    newTag.value = ''
  }
}

const removeTag = (tagToRemove: string) => {
  if (values.tags) {
    setFieldValue('tags', values.tags.filter(tag => tag !== tagToRemove))
  }
}



const handleCreateDataset = handleSubmit(async (formData) => {
  isCreating.value = true
  try {
    await createDataset(formData as DatasetUpsert)
    showSuccess(`สร้าง dataset "${formData.name}" เรียบร้อยแล้ว`)
    showCreateDialog.value = false
    resetForm()
    await loadDatasets()
  } catch (error: any) {
    console.error('Error creating dataset:', error)
    showError(error.message || 'ไม่สามารถสร้าง dataset ได้')
  } finally {
    isCreating.value = false
  }
})

const getSensitivityColor = (sensitivity: string) => {
  switch (sensitivity) {
    case DATASET_SENSITIVITY.PUBLIC: return 'bg-green-100 text-green-800'
    case DATASET_SENSITIVITY.INTERNAL: return 'bg-blue-100 text-blue-800'
    case DATASET_SENSITIVITY.CONFIDENTIAL: return 'bg-orange-100 text-orange-800'
    case DATASET_SENSITIVITY.RESTRICTED: return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getSensitivityText = (sensitivity: string) => {
  switch (sensitivity) {
    case DATASET_SENSITIVITY.PUBLIC: return 'สาธารณะ'
    case DATASET_SENSITIVITY.INTERNAL: return 'ภายใน'
    case DATASET_SENSITIVITY.CONFIDENTIAL: return 'ความลับ'
    case DATASET_SENSITIVITY.RESTRICTED: return 'จำกัด'
    default: return 'ไม่ระบุ'
  }
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
watch(searchQuery, () => {
  debouncedSearch()
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
        <Button @click="showCreateDialog = true" class="flex items-center gap-2">
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
            <Button @click="handleSearch" :disabled="isLoading">
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
              ค้นหา
            </Button>
            <Button 
              v-if="searchQuery" 
              @click="searchQuery = ''; handleSearch()" 
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
            <Button @click="loadDatasets()" variant="outline">
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
            <Button @click="showCreateDialog = true" variant="outline">
              <Plus class="h-4 w-4 mr-2" />
              สร้าง Dataset แรก
            </Button>
          </div>

          <!-- Data table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ Dataset</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sensitivity</TableHead>
                <TableHead>Has PII</TableHead>
                <TableHead class="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="dataset in datasets" :key="dataset.id">
                <TableCell>
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
                <TableCell>
                  <Badge :class="getSensitivityColor(dataset.sensitivity)" variant="secondary" class="text-xs">
                    {{ getSensitivityText(dataset.sensitivity) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge v-if="dataset.has_pii" variant="destructive" class="text-xs">
                    PII
                  </Badge>
                  <span v-else class="text-muted-foreground text-sm">-</span>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click="handleDeleteClick(dataset)"
                      :disabled="isDeleting === dataset.id"
                    >
                      <Loader2 v-if="isDeleting === dataset.id" class="h-4 w-4 animate-spin" />
                      <Trash2 v-else class="h-4 w-4" />
                    </Button>
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

    <!-- Create Dataset Dialog -->
    <Sheet v-model:open="showCreateDialog">
      <SheetContent class="w-[400px] sm:w-[540px] p-6">
        <SheetHeader>
          <SheetTitle>สร้าง Dataset ใหม่</SheetTitle>
          <SheetDescription>
            กรอกข้อมูลเพื่อสร้าง dataset ใหม่ในระบบ
          </SheetDescription>
        </SheetHeader>
        
        <div class="grid gap-6 py-6">
          <!-- Dataset ID -->
          <FormField v-slot="{ componentField }" name="id">
            <FormItem>
              <FormLabel>Dataset ID *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น person_data_stat_view"
                  class="font-mono"
                />
              </FormControl>
              <!-- <FormDescription>
                ใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น (เช่น student_records_2024)
              </FormDescription> -->
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Dataset Name -->
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>ชื่อ Dataset *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น Student Records 2024"
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
                  placeholder="อธิบายเกี่ยวกับข้อมูลในชุดข้อมูลนี้..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Domain -->
          <FormField v-slot="{ componentField }" name="domain">
            <FormItem>
              <FormLabel>Domain *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="education, finance, healthcare..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Owner -->
          <FormField v-slot="{ componentField }" name="owner">
            <FormItem>
              <FormLabel>Owner *</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="เช่น Data Team, John Doe, Marketing Department"
                />
              </FormControl>
              <FormDescription>
                ระบุบุคคลหรือทีมที่เป็นเจ้าของชุดข้อมูลนี้
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Tags -->
          <div class="grid gap-2">
            <Label>Tags</Label>
            <div class="flex gap-2">
              <Input
                v-model="newTag"
                placeholder="เพิ่ม tag..."
                @keyup.enter="addTag"
                class="flex-1"
              />
              <Button @click="addTag" variant="outline" size="sm">
                เพิ่ม
              </Button>
            </div>
            <div v-if="values.tags && values.tags.length > 0" class="flex flex-wrap gap-1">
              <Badge
                v-for="tag in values.tags"
                :key="tag"
                variant="secondary"
                class="flex items-center gap-1"
              >
                {{ tag }}
                <button @click="removeTag(tag)" class="ml-1 hover:text-destructive">
                  <X class="h-3 w-3" />
                </button>
              </Badge>
            </div>
          </div>

          <!-- Sensitivity -->
          <FormField v-slot="{ componentField }" name="sensitivity">
            <FormItem>
              <FormLabel>Sensitivity Level</FormLabel>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก Sensitivity Level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem :value="DATASET_SENSITIVITY.PUBLIC">สาธารณะ (Public)</SelectItem>
                  <SelectItem :value="DATASET_SENSITIVITY.INTERNAL">ภายใน (Internal)</SelectItem>
                  <SelectItem :value="DATASET_SENSITIVITY.CONFIDENTIAL">ความลับ (Confidential)</SelectItem>
                  <SelectItem :value="DATASET_SENSITIVITY.RESTRICTED">จำกัด (Restricted)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Has PII -->
          <FormField v-slot="{ value, handleChange }" name="has_pii">
            <FormItem class="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  :checked="value"
                  @update:checked="handleChange"
                />
              </FormControl>
              <div class="space-y-1 leading-none">
                <FormLabel>
                  ข้อมูลมีส่วนที่เป็นข้อมูลส่วนบุคคล (PII)
                </FormLabel>
                <FormDescription>
                  ทำเครื่องหมายหากชุดข้อมูลนี้มีข้อมูลส่วนบุคคล
                </FormDescription>
              </div>
            </FormItem>
          </FormField>
        </div>

        <div class="flex justify-end gap-2">
          <Button
            variant="outline"
            @click="showCreateDialog = false; resetForm()"
            :disabled="isCreating"
          >
            ยกเลิก
          </Button>
          <Button @click="handleCreateDataset" :disabled="isCreating">
            <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin mr-2" />
            สร้าง Dataset
          </Button>
        </div>
      </SheetContent>
    </Sheet>

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
