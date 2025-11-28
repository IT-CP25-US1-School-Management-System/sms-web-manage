<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Database, Search, FileJson, AlertCircle } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/lib/constants'
import { dataApiInstance } from '@/stores/api'

const route = useRoute()
const router = useRouter()

const datasetId = ref<string>(route.params.id as string)
const version = ref<string>(route.params.version as string)
const versionData = ref<any>(null)
const isLoadingVersion = ref(true)
const data = ref<any[]>([])
const isLoadingData = ref(false)
const selectedView = ref('')
const searchKey = ref('')
const versionError = ref<string | null>(null)
const dataError = ref<string | null>(null)

// Pagination
const currentPage = ref(1)
const totalPages = ref(0)
const totalRows = ref(0)
const perPage = ref(20)

const goBack = () => {
  router.push({ name: ROUTE_NAMES.DATASET_VERSION, params: { id: datasetId.value } })
}

const loadVersion = async () => {
  try {
    isLoadingVersion.value = true
    const response = await dataApiInstance.get(`/v1/datasets/${datasetId.value}/versions/${version.value}`)
    versionData.value = response.data.data
    
    // Set default view
    if (versionData.value?.policies?.runtime?.default_view) {
      selectedView.value = versionData.value.policies.runtime.default_view
    }
  } catch (error: any) {
    console.error('Failed to load version:', error)
    if (error.response?.status === 403) {
      versionError.value = 'ไม่มีสิทธิ์ในการเข้าถึง Dataset Version นี้'
    } else if (error.response?.status === 404) {
      versionError.value = 'ไม่พบ Dataset Version ที่ระบุ'
    } else {
      versionError.value = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูล Version ได้'
    }
  } finally {
    isLoadingVersion.value = false
  }
}

const loadData = async () => {
  if (!selectedView.value) return
  
  dataError.value = null // Clear previous errors
  try {
    isLoadingData.value = true
    const params: any = {
      view: selectedView.value,
      page: currentPage.value,
      per_page: perPage.value,
    }
    
    const response = await dataApiInstance.get(
      `/v1/datasets/${datasetId.value}/versions/${version.value}/data`,
      { params }
    )
    
    data.value = response.data.data
    currentPage.value = response.data.page
    totalPages.value = response.data.total_pages
    totalRows.value = response.data.total_rows
  } catch (error: any) {
    console.error('Failed to load data:', error)
    if (error.response?.status === 403) {
      dataError.value = 'ไม่มีสิทธิ์ในการดึงข้อมูลจาก View นี้'
    } else if (error.response?.status === 404) {
      dataError.value = 'ไม่พบข้อมูลใน View ที่ระบุ'
    } else {
      dataError.value = error.response?.data?.message || 'ไม่สามารถดึงข้อมูลได้'
    }
    data.value = []
  } finally {
    isLoadingData.value = false
  }
}

const searchByKey = async () => {
  if (!searchKey.value.trim()) return
  
  dataError.value = null // Clear previous errors
  try {
    isLoadingData.value = true
    const params: any = {}
    if (selectedView.value) {
      params.view = selectedView.value
    }
    
    const response = await dataApiInstance.get(
      `/v1/datasets/${datasetId.value}/versions/${version.value}/data/key/${searchKey.value}`,
      { params }
    )
    
    data.value = [response.data.data]
    totalRows.value = 1
    totalPages.value = 1
    currentPage.value = 1
  } catch (error: any) {
    console.error('Failed to search by key:', error)
    if (error.response?.status === 403) {
      dataError.value = 'ไม่มีสิทธิ์ในการค้นหาข้อมูล'
    } else if (error.response?.status === 404) {
      dataError.value = 'ไม่พบข้อมูลที่ค้นหา'
    } else {
      dataError.value = error.response?.data?.message || 'ไม่สามารถค้นหาข้อมูลได้'
    }
    data.value = []
  } finally {
    isLoadingData.value = false
  }
}

const clearSearch = () => {
  searchKey.value = ''
  currentPage.value = 1
  loadData()
}

const availableViews = computed(() => {
  return Object.keys(versionData.value?.policies?.views || {})
})

// Flatten nested objects from joins
const flattenObject = (obj: any, prefix = ''): any => {
  const flattened: any = {}
  
  for (const key in obj) {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }
  
  return flattened
}

const flattenedData = computed(() => {
  return data.value.map(row => flattenObject(row))
})

const dataColumns = computed(() => {
  if (!flattenedData.value || flattenedData.value.length === 0) return []
  return Object.keys(flattenedData.value[0] || {})
})

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    loadData()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadData()
  }
}

onMounted(async () => {
  await loadVersion()
  if (selectedView.value) {
    loadData()
  }
})
</script>

<template>
  <MainLayout>
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="sm" @click="goBack" class="flex items-center gap-2">
          <ArrowLeft class="h-4 w-4" />
          Back
        </Button>
      </div>

      <!-- Version Info -->
      <Card>
        <CardHeader>
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <CardTitle class="flex items-center gap-2">
                <Database class="h-5 w-5" />
                <Skeleton v-if="isLoadingVersion" class="h-8 w-64" />
                <span v-else>{{ datasetId }} - {{ version }}</span>
              </CardTitle>
              <CardDescription>
                Dataset Version Data Serving
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <!-- Version Error -->
        <CardContent v-if="versionError" class="border-t">
          <div class="flex items-center justify-center py-8 text-center">
            <div class="space-y-3">
              <AlertCircle class="h-12 w-12 text-destructive mx-auto" />
              <h3 class="text-lg font-semibold text-destructive">ไม่สามารถโหลดข้อมูล Version ได้</h3>
              <p class="text-muted-foreground max-w-md">{{ versionError }}</p>
            </div>
          </div>
        </CardContent>
        
        <CardContent v-else-if="!isLoadingVersion && versionData">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div class="text-sm text-muted-foreground">Status</div>
              <Badge :class="versionData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" variant="secondary">
                {{ versionData.status }}
              </Badge>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Default View</div>
              <div class="font-medium">{{ versionData.policies?.runtime?.default_view || '-' }}</div>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Key Field</div>
              <div class="font-medium font-mono">{{ versionData.policies?.runtime?.key_field || '-' }}</div>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Available Views</div>
              <div class="font-medium">{{ availableViews.length }} views</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Data Query -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileJson class="h-5 w-5" />
            Query Data
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- View Selection & Search -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>Select View</Label>
              <Select v-model="selectedView" @update:model-value="loadData">
                <SelectTrigger>
                  <SelectValue placeholder="Choose a view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="view in availableViews" :key="view" :value="view">
                    {{ view }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="space-y-2 md:col-span-2">
              <Label>Search by Key ({{ versionData?.policies?.runtime?.key_field || 'id' }})</Label>
              <div class="flex gap-2">
                <Input 
                  v-model="searchKey" 
                  placeholder="Enter key value..." 
                  @keyup.enter="searchByKey"
                />
                <Button @click="searchByKey" :disabled="!searchKey.trim() || isLoadingData">
                  <Search class="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button v-if="searchKey" @click="clearSearch" variant="outline">
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div v-if="!selectedView" class="text-center py-8 text-muted-foreground">
            Please select a view to query data
          </div>
          
          <!-- Data Error -->
          <div v-else-if="dataError" class="flex items-center justify-center py-8 text-center">
            <div class="space-y-3">
              <AlertCircle class="h-10 w-10 text-destructive mx-auto" />
              <h3 class="text-lg font-semibold text-destructive">เกิดข้อผิดพลาด</h3>
              <p class="text-muted-foreground max-w-md">{{ dataError }}</p>
              <Button @click="loadData()" variant="outline" size="sm" class="cursor-pointer">
                ลองใหม่
              </Button>
            </div>
          </div>

          <!-- Data Table -->
          <div v-else-if="isLoadingData" class="space-y-2">
            <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
          </div>

          <div v-else-if="data.length === 0" class="text-center py-8 text-muted-foreground">
            No data found
          </div>

          <div v-else class="space-y-4">
            <div class="rounded-md border overflow-x-auto w-full">
              <Table class="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead v-for="col in dataColumns" :key="col" class="font-mono text-xs whitespace-nowrap min-w-[150px]">
                      {{ col }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(row, i) in flattenedData" :key="i">
                    <TableCell v-for="col in dataColumns" :key="col" class="font-mono text-xs max-w-[300px]">
                      <template v-if="typeof row[col] === 'object' && row[col] !== null">
                        <code class="text-xs bg-muted px-2 py-1 rounded">{{ JSON.stringify(row[col]) }}</code>
                      </template>
                      <template v-else-if="row[col] === null">
                        <span class="text-muted-foreground italic">null</span>
                      </template>
                      <template v-else>
                        {{ row[col] }}
                      </template>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between">
              <div class="text-sm text-muted-foreground">
                Showing {{ data.length }} of {{ totalRows }} rows (Page {{ currentPage }} / {{ totalPages }})
              </div>
              
              <div v-if="totalPages > 1" class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  @click="previousPage" 
                  :disabled="currentPage === 1"
                >
                  Previous
                </Button>
                
                <div class="text-sm">
                  Page {{ currentPage }} / {{ totalPages }}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  @click="nextPage" 
                  :disabled="currentPage === totalPages"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </MainLayout>
</template>
