<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Loader2, X } from 'lucide-vue-next'
import { dataApiInstance } from '@/stores/api'
import { DATASET_SENSITIVITY, ROUTE_NAMES } from '@/lib/constants'
import type { DatasetUpsert, ApiResponse } from '@/types/dataset'

const router = useRouter()
const { showError, showSuccess } = useToast()

// Reactive data
const isCreating = ref(false)
const newTag = ref('')
const showSheet = ref(true) // Control sheet visibility

// Close sheet and navigate back
const closeSheet = () => {
  showSheet.value = false
  // Wait for animation then navigate
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.DATASET })
  }, 300)
}

// Form validation schema
const datasetSchema = toTypedSchema(z.object({
  id: z.string().min(1, 'กรุณาระบุ Dataset ID').max(50, 'Dataset ID ต้องไม่เกิน 50 ตัวอักษร').regex(/^[a-z_][a-z0-9_]*$/, 'Dataset ID ต้องขึ้นต้นด้วยตัวอักษรเล็กหรือ _ และใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น'),
  name: z.string().min(1, 'กรุณาระบุชื่อ Dataset').max(100, 'ชื่อ Dataset ต้องไม่เกิน 100 ตัวอักษร'),
  description: z.string().min(1, 'กรุณาระบุคำอธิบาย Dataset').max(500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร'),
  domain: z.string().min(1, 'กรุณาระบุ Domain').max(50, 'Domain ต้องไม่เกิน 50 ตัวอักษร'),
  owner: z.string().min(1, 'กรุณาระบุชื่อ Owner').max(100, 'ชื่อ Owner ต้องไม่เกิน 100 ตัวอักษร'),
  tags: z.array(z.string()).optional(),
  has_pii: z.boolean(),
  sensitivity: z.enum([DATASET_SENSITIVITY.PUBLIC, DATASET_SENSITIVITY.INTERNAL, DATASET_SENSITIVITY.CONFIDENTIAL, DATASET_SENSITIVITY.RESTRICTED])
}))

// Form setup
const { handleSubmit, values, setFieldValue } = useForm({
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

// API functions
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

// Functions
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
    closeSheet()
  } catch (error: any) {
    console.error('Error creating dataset:', error)
    showError(error.message || 'ไม่สามารถสร้าง dataset ได้')
  } finally {
    isCreating.value = false
  }
})

</script>

<template>
  <Sheet v-model:open="showSheet" @update:open="(open) => !open && closeSheet()">
    <SheetContent class="w-[400px] sm:w-[540px] p-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>สร้าง Dataset ใหม่</SheetTitle>
        <SheetDescription>
          กรอกข้อมูลเพื่อสร้าง dataset ใหม่ในระบบ
        </SheetDescription>
      </SheetHeader>
      
      <form @submit="handleCreateDataset" class="space-y-6 py-6">
        <!-- Dataset ID -->
        <FormField v-slot="{ componentField }" name="id">
          <FormItem>
            <FormLabel>Dataset ID <span class="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                v-bind="componentField"
                placeholder="เช่น person_data_stat_view"
                class="font-mono"
              />
            </FormControl>
            <FormDescription>
              ต้องขึ้นต้นด้วยตัวอักษรเล็กหรือ _ และใช้ตัวอักษรเล็ก ตัวเลข และ _ เท่านั้น
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Dataset Name -->
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>ชื่อ Dataset <span class="text-red-500">*</span></FormLabel>
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
            <FormLabel>คำอธิบาย <span class="text-red-500">*</span></FormLabel>
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
            <FormLabel>Domain <span class="text-red-500">*</span></FormLabel>
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
            <FormLabel>Owner <span class="text-red-500">*</span></FormLabel>
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
        <div class="space-y-2">
          <Label>Tags</Label>
          <div class="flex gap-2">
            <Input
              v-model="newTag"
              placeholder="เพิ่ม tag..."
              @keyup.enter.prevent="addTag"
              class="flex-1"
            />
            <Button @click="addTag" variant="outline" size="sm" type="button">
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
              <button @click="removeTag(tag)" class="ml-1 hover:text-destructive" type="button">
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

        <!-- Submit buttons -->
        <div class="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            @click="closeSheet"
            :disabled="isCreating"
          >
            ยกเลิก
          </Button>
          <Button type="submit" :disabled="isCreating">
            <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin mr-2" />
            สร้าง Dataset
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>