<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useToast } from '@/composables/useToast'
import { dataApiInstance, authApiInstance } from '@/stores/api'
import { ROUTE_NAMES } from '@/lib/constants'
import type { Roles, RolesSearchResponse } from '@/types/roles'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Stepper,
  StepperDescription,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import { Loader2, Plus, X, ChevronLeft, ChevronRight, Check } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useToast()

const datasetId = ref<string>(route.params.id as string)
const isOpen = ref(true)
const isSubmitting = ref(false)
const sources = ref<Array<{ id: string; name: string }>>([])
const isLoadingSources = ref(false)
const schemas = ref<Array<{ schema: string }>>([])
const tables = ref<Array<{ schema: string; table_name: string }>>([])
const columns = ref<Array<{ schema: string; table_name: string; column_name: string; data_type: string; is_nullable: boolean }>>([])
const isLoadingSchemas = ref(false)
const isLoadingTables = ref(false)
const isLoadingColumns = ref(false)
const selectedSchema = ref('')
const selectedTable = ref('')
const currentStep = ref(1)
const roles = ref<Roles[]>([])
const isLoadingRoles = ref(false)

// Zod schemas for each step
const step1Schema = z.object({
  version: z.string()
    .min(1, 'กรุณากรอก Version')
    .regex(/^v\d+\.\d+\.\d+$/, 'รูปแบบ Version ต้องเป็น v{major}.{minor}.{patch} เช่น v1.0.0, v2.1.3'),
  source_id: z.string().uuid('กรุณาเลือก Database'),
  status: z.enum(['active', 'preview', 'deprecated'])
})

const step2Schema = z.object({
  schema: z.object({
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      is_nullable: z.boolean(),
      table_name: z.string(),
      alias: z.string(),
      enum: z.array(z.string()).optional()
    })).min(1, 'กรุณาเลือกอย่างน้อย 1 column')
  })
})

const step3Schema = z.object({
  access_policies: z.array(z.object({
    role: z.string().min(1, 'กรุณากรอก Role'),
    scope: z.string().default('all'),
    can_view: z.boolean(),
    can_edit: z.boolean(),
    can_delete: z.boolean(),
    allow_view: z.array(z.string())
  })).min(1, 'กรุณาเพิ่มอย่างน้อย 1 policy')
})

const step4Schema = z.object({
  policies: z.object({
    runtime: z.object({
      default_view: z.string().min(1, 'กรุณากรอก Default View'),
      key_field: z.string().min(1, 'กรุณากรอก Key Field')
    })
  })
})

const fullSchema = z.object({
  version: z.string()
    .min(1, 'กรุณากรอก Version')
    .regex(/^v\d+\.\d+\.\d+$/, 'รูปแบบ Version ต้องเป็น v{major}.{minor}.{patch} เช่น v1.0.0, v2.1.3'),
  source_id: z.string().uuid('กรุณาเลือก Database'),
  status: z.enum(['active', 'preview', 'deprecated']),
  schema: z.object({
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      is_nullable: z.boolean(),
      table_name: z.string(),
      alias: z.string(),
      enum: z.array(z.string()).optional()
    })).min(1, 'กรุณาเลือกอย่างน้อย 1 column')
  }),
  access_policies: z.array(z.object({
    role: z.string().min(1, 'กรุณากรอก Role'),
    scope: z.string().default('all'),
    can_view: z.boolean(),
    can_edit: z.boolean(),
    can_delete: z.boolean(),
    allow_view: z.array(z.string())
  })).min(1, 'กรุณาเพิ่มอย่างน้อย 1 policy'),
  policies: z.object({
    runtime: z.object({
      default_view: z.string().min(1, 'กรุณากรอก Default View'),
      key_field: z.string().min(1, 'กรุณากรอก Key Field'),
      query: z.any()
    }),
    views: z.record(z.string(), z.any()),
    write: z.object({
      key_field: z.string(),
      allow_edit: z.array(z.string()),
      query: z.any()
    }).optional(),
    delete: z.object({
      key_field: z.string(),
      query: z.any()
    }).optional()
  })
})

// vee-validate form
const { validate, setFieldValue, values } = useForm({
  validationSchema: toTypedSchema(fullSchema),
  initialValues: {
    version: '',
    source_id: '',
    status: 'active' as 'active' | 'preview' | 'deprecated',
    schema: {
      columns: []
    },
    access_policies: [],
    policies: {
      runtime: {
        default_view: '',
        key_field: '',
        query: {
          from: { table: '' },
          joins: [],
          projections: [],
          group_by: [],
          where_allow: []
        }
      },
      views: {},
      write: {
        key_field: '',
        allow_edit: [],
        query: {
          from: { table: '' },
          projections: []
        }
      },
      delete: {
        key_field: '',
        query: {
          from: { table: '' },
          projections: []
        }
      }
    }
  }
})

// Form data - ใช้ values จาก vee-validate โดยตรง
const formData = computed(() => values)

// Temporary fields for adding items
const newPolicy = ref({ role: '', scope: 'all', can_view: true, can_edit: false, can_delete: false, allow_view: [] as string[] })
const newViewName = ref('')
// แต่ละ view มี state แยกกัน - ใช้ Record<viewName, tableData>
const viewTableSelections = ref<Record<string, { table_name: string; columns: string[] }>>({})

// Step 5: Join configuration
const mainTable = ref('')
const newJoin = ref({
  table: '',
  leftColumn: '',
  rightColumn: ''
})

const steps = [
  { id: 1, title: 'ข้อมูลพื้นฐาน', description: 'Version, Database, Status' },
  { id: 2, title: 'Schema', description: 'Columns และ Types' },
  { id: 3, title: 'Views', description: 'กำหนด Views' },
  { id: 4, title: 'Access Policies', description: 'สิทธิ์การเข้าถึง' },
  { id: 5, title: 'Runtime Policies', description: 'Query Configuration' },
]

const canGoNext = computed(() => {
  if (currentStep.value === 1) {
    const result = step1Schema.safeParse(values)
    return result.success
  }
  if (currentStep.value === 2) {
    const result = step2Schema.safeParse({ schema: values.schema })
    return result.success
  }
  if (currentStep.value === 3) {
    // Step 3: Views - ต้องมีอย่างน้อย 1 view
    const viewsCount = Object.keys(values.policies?.views || {}).length
    return viewsCount > 0
  }
  if (currentStep.value === 4) {
    const result = step3Schema.safeParse({ access_policies: values.access_policies })
    return result.success
  }
  if (currentStep.value === 5) {
    const result = step4Schema.safeParse({ policies: values.policies })
    return result.success
  }
  return true
})



const loadSources = async () => {
  try {
    isLoadingSources.value = true
    const response = await dataApiInstance.get('/v1/introspect/sources', {
      params: { per_page: 100,page:1 }
    })
    sources.value = response.data.data.map((source: any) => ({
      id: source.id,
      name: source.name,
    }))
  } catch (error) {
    console.error('Failed to load databases:', error)
    showError('ไม่สามารถโหลดข้อมูล Database ได้', {
      description: 'กรุณาลองใหม่อีกครั้ง',
    })
  } finally {
    isLoadingSources.value = false
  }
}

const loadSchemas = async () => {
  if (!values.source_id) return
  try {
    isLoadingSchemas.value = true
    const response = await dataApiInstance.get('/v1/introspect/schemas', {
      params: { source_id: values.source_id, per_page: 100,page:1 }
    })
    schemas.value = response.data.data
  } catch (error) {
    console.error('Failed to load schemas:', error)
    showError('ไม่สามารถโหลดข้อมูล Schema ได้')
  } finally {
    isLoadingSchemas.value = false
  }
}

const loadTables = async () => {
  if (!values.source_id || !selectedSchema.value) return
  try {
    isLoadingTables.value = true
    const response = await dataApiInstance.get('/v1/introspect/tables', {
      params: { source_id: values.source_id, schema: selectedSchema.value, per_page: 100,page:1 }
    })
    tables.value = response.data.data
  } catch (error) {
    console.error('Failed to load tables:', error)
    showError('ไม่สามารถโหลดข้อมูล Table ได้')
  } finally {
    isLoadingTables.value = false
  }
}

const loadColumns = async () => {
  if (!values.source_id || !selectedSchema.value || !selectedTable.value) return
  try {
    isLoadingColumns.value = true
    const response = await dataApiInstance.get('/v1/introspect/columns', {
      params: { 
        source_id: values.source_id, 
        schema: selectedSchema.value, 
        table: selectedTable.value,
        per_page: 100,
        page:1
      }
    })
    // Sort by ordinal_position (ascending)
    columns.value = response.data.data.sort((a: any, b: any) => {
      const posA = a.ordinal_position ?? Number.MAX_SAFE_INTEGER
      const posB = b.ordinal_position ?? Number.MAX_SAFE_INTEGER
      return posA - posB
    })
  } catch (error) {
    console.error('Failed to load columns:', error)
    showError('ไม่สามารถโหลดข้อมูล Column ได้')
  } finally {
    isLoadingColumns.value = false
  }
}

const loadRoles = async () => {
  try {
    isLoadingRoles.value = true
    const response = await authApiInstance.get<RolesSearchResponse>('/v1/auth/roles', {
      params: { per_page: 100, page: 1 }
    })
    roles.value = response.data.data
  } catch (error) {
    console.error('Failed to load roles:', error)
    showError('ไม่สามารถโหลดข้อมูล Role ได้', {
      description: 'กรุณาลองใหม่อีกครั้ง'
    })
  } finally {
    isLoadingRoles.value = false
  }
}

// Step 2: Schema functions
const addColumnFromList = (column: any) => {
  const currentColumns = formData.value.schema?.columns || []
  const exists = currentColumns.some(
    c => c.name === column.column_name && c.table_name === column.table_name
  )
  if (!exists) {
    const newColumns = [...currentColumns, {
      name: column.column_name,
      type: column.data_type,
      is_nullable: column.is_nullable,
      table_name: column.table_name,
      alias: column.column_name,
      enum: []
    }]
    setFieldValue('schema.columns', newColumns)
    
    // เพิ่ม column เข้า projections ด้วย (รูปแบบ object)
    const currentProjections = formData.value.policies?.runtime?.query?.projections || []
    const projectionExists = currentProjections.some(
      (p: any) => p.table_name === column.table_name && p.column === column.column_name
    )
    if (!projectionExists) {
      const newProjections = [...currentProjections, {
        table_name: column.table_name,
        column: column.column_name,
        alias: column.column_name
      }]
      setFieldValue('policies.runtime.query.projections', newProjections)
    }
  }
}

const addAllColumnsFromTable = () => {
  if (!selectedTable.value || columns.value.length === 0) return
  columns.value.forEach(column => {
    addColumnFromList(column)
  })
}

const removeColumn = (index: number) => {
  const currentColumns = formData.value.schema?.columns || []
  const columnToRemove = currentColumns[index]
  const newColumns = currentColumns.filter((_: any, i: number) => i !== index)
  setFieldValue('schema.columns', newColumns)
  
  // ลบ column จาก projections ด้วย
  if (columnToRemove) {
    const currentProjections = formData.value.policies?.runtime?.query?.projections || []
    const newProjections = currentProjections.filter(
      (p: any) => !(p.table_name === columnToRemove.table_name && p.column === columnToRemove.name)
    )
    setFieldValue('policies.runtime.query.projections', newProjections)
  }
}

const removeTableColumns = (tableName: string) => {
  const currentColumns = formData.value.schema?.columns || []
  const newColumns = currentColumns.filter(
    col => col.table_name !== tableName
  )
  setFieldValue('schema.columns', newColumns)
  
  // ลบ columns ของ table นี้จาก projections ด้วย
  const currentProjections = formData.value.policies?.runtime?.query?.projections || []
  const newProjections = currentProjections.filter((p: any) => p.table_name !== tableName)
  setFieldValue('policies.runtime.query.projections', newProjections)
}

const groupedColumns = computed(() => {
  const groups: Record<string, any[]> = {}
  const currentColumns = formData.value.schema?.columns || []
  currentColumns.forEach(col => {
    if (!groups[col.table_name]) {
      groups[col.table_name] = []
    }
    groups[col.table_name]!.push(col)
  })
  return groups
})

// Get unique table names from Step 2 for use in Step 3
const availableTables = computed(() => {
  return Object.keys(groupedColumns.value)
})

// Get available views from Step 3 for use in Step 4
const availableViews = computed(() => {
  return Object.keys(formData.value.policies?.views || {})
})

// Step 4: Access Policies functions
const addPolicy = () => {
  console.log('Before add - newPolicy:', JSON.parse(JSON.stringify(newPolicy.value)))
  console.log('Current access_policies:', JSON.parse(JSON.stringify(values.access_policies)))
  
  if (newPolicy.value.role && newPolicy.value.allow_view.length > 0) {
    const currentPolicies = values.access_policies || []
    
    // ตรวจสอบว่ามี role + view ซ้ำกันหรือไม่ (ไม่ว่า permissions จะเหมือนหรือไม่)
    const duplicateViews: string[] = []
    newPolicy.value.allow_view.forEach(view => {
      const isDuplicate = currentPolicies.some((p: any) => 
        p.role === newPolicy.value.role && 
        p.scope === newPolicy.value.scope &&
        p.allow_view.includes(view)
      )
      if (isDuplicate) {
        duplicateViews.push(view)
      }
    })
    
    // ถ้ามี view ซ้ำ แสดง error และหยุดการทำงาน
    if (duplicateViews.length > 0) {
      showError('ไม่สามารถเพิ่ม Policy ได้', {
        description: `มีการกำหนด Role "${newPolicy.value.role}" สำหรับ View: ${duplicateViews.join(', ')} อยู่แล้ว กรุณาเลือก View อื่นหรือแก้ไข Policy ที่มีอยู่`
      })
      return
    }
    
    // หา policy ที่มี role + permissions เหมือนกันทุกอย่าง
    const existingPolicyIndex = currentPolicies.findIndex(
      (p: any) => 
        p.role === newPolicy.value.role && 
        p.scope === newPolicy.value.scope &&
        p.can_view === newPolicy.value.can_view &&
        p.can_edit === newPolicy.value.can_edit &&
        p.can_delete === newPolicy.value.can_delete
    )
    
    if (existingPolicyIndex > -1) {
      // ถ้ามี policy ที่ role + permissions เหมือนกันทุกอย่าง ให้รวม tables
      const existingPolicy = currentPolicies[existingPolicyIndex]!
      const mergedTables = [...new Set([...existingPolicy.allow_view, ...newPolicy.value.allow_view])]
      
      const newPolicies = [...currentPolicies]
      newPolicies[existingPolicyIndex] = {
        role: existingPolicy.role,
        scope: existingPolicy.scope,
        can_view: existingPolicy.can_view,
        can_edit: existingPolicy.can_edit,
        can_delete: existingPolicy.can_delete,
        allow_view: mergedTables,
      }
      setFieldValue('access_policies', newPolicies)
    } else {
      // ถ้าไม่มี policy ที่เหมือนกันทุกอย่าง ให้สร้าง policy ใหม่แยกออกมา
      const newPolicies = [...currentPolicies, {
        role: newPolicy.value.role,
        scope: newPolicy.value.scope,
        can_view: newPolicy.value.can_view,
        can_edit: newPolicy.value.can_edit,
        can_delete: newPolicy.value.can_delete,
        allow_view: [...newPolicy.value.allow_view]
      }]
      setFieldValue('access_policies', newPolicies)
    }
    
    console.log('After add - access_policies:', JSON.parse(JSON.stringify(values.access_policies)))
    
    // Reset form ใช้ nextTick เพื่อให้ Vue update DOM ก่อน
    nextTick(() => {
      newPolicy.value = {
        role: '',
        scope: 'all',
        can_view: true,
        can_edit: false,
        can_delete: false,
        allow_view: [],
      }
      console.log('After reset - newPolicy:', JSON.parse(JSON.stringify(newPolicy.value)))
    })
  }
}

const removePolicy = (index: number) => {
  const currentPolicies = formData.value.access_policies || []
  const newPolicies = currentPolicies.filter((_: any, i: number) => i !== index)
  setFieldValue('access_policies', newPolicies)
}

const toggleViewInPolicy = (viewName: string) => {
  // ถ้า view นี้มี policy ซ้ำอยู่แล้ว ไม่ให้ toggle
  if (isViewAlreadyInPolicy(viewName)) {
    return
  }
    
  const index = newPolicy.value.allow_view.indexOf(viewName)
  if (index > -1) {
    newPolicy.value.allow_view.splice(index, 1)
  } else {
    newPolicy.value.allow_view.push(viewName)
  }
}

const isViewSelected = (viewName: string): boolean => {
  return newPolicy.value.allow_view.includes(viewName)
}

// ตรวจสอบว่า view นี้มี policy ซ้ำกับ role ปัจจุบันหรือไม่
const isViewAlreadyInPolicy = (viewName: string): boolean => {
  const currentPolicies = values.access_policies || []
  return currentPolicies.some((p: any) => 
    p.role === newPolicy.value.role && 
    p.scope === newPolicy.value.scope &&
    p.allow_view.includes(viewName)
  )
}

// Step 3: Views functions
const addView = () => {
  const currentViews = formData.value.policies?.views || {}
  if (newViewName.value.trim() && !currentViews[newViewName.value.trim()]) {
    const newViews = { ...currentViews, [newViewName.value.trim()]: [] }
    setFieldValue('policies.views', newViews)
    // สร้าง state สำหรับ view ใหม่
    viewTableSelections.value[newViewName.value.trim()] = { table_name: '', columns: [] }
    newViewName.value = ''
  }
}

const removeView = (viewName: string) => {
  const currentViews = formData.value.policies?.views || {}
  const newViews = { ...currentViews }
  delete newViews[viewName]
  setFieldValue('policies.views', newViews)
  // ลบ state ของ view นี้ด้วย
  delete viewTableSelections.value[viewName]
}

// ฟังก์ชันสำหรับจัดการ columns ของแต่ละ view
const toggleViewColumn = (viewName: string, columnName: string) => {
  if (!viewTableSelections.value[viewName]) {
    viewTableSelections.value[viewName] = { table_name: '', columns: [] }
  }
  const index = viewTableSelections.value[viewName]!.columns.indexOf(columnName)
  if (index > -1) {
    viewTableSelections.value[viewName]!.columns.splice(index, 1)
  } else {
    viewTableSelections.value[viewName]!.columns.push(columnName)
  }
}

const isViewColumnSelected = (viewName: string, columnName: string): boolean => {
  return viewTableSelections.value[viewName]?.columns.includes(columnName) || false
}

const removeViewColumn = (viewName: string, col: string) => {
  if (viewTableSelections.value[viewName]) {
    viewTableSelections.value[viewName]!.columns = viewTableSelections.value[viewName]!.columns.filter(c => c !== col)
  }
}

// ดึง columns ของ table ที่เลือกใน view นั้นๆ
const getColumnsForViewTable = (viewName: string) => {
  return computed(() => {
    const selection = viewTableSelections.value[viewName]
    if (!selection || !selection.table_name) return []
    const tableColumns = groupedColumns.value[selection.table_name] || []
    return tableColumns.map((col: any) => col.name)
  })
}

// ตรวจสอบว่า table นี้มีใน view แล้วหรือไม่
const isTableInView = (viewName: string, tableName: string): boolean => {
  const currentViews = formData.value.policies?.views || {}
  const viewTables = currentViews[viewName] || []
  return viewTables.some((t: any) => t.table_name === tableName)
}

// เพิ่ม table เข้า view
const addTableToView = (viewName: string) => {
  const selection = viewTableSelections.value[viewName]
  if (!selection || !selection.table_name || selection.columns.length === 0) return
  
  const currentViews = formData.value.policies?.views || {}
  const currentViewTables = currentViews[viewName] || []
  
  // ตรวจสอบ table ซ้ำในview เดียวกัน
  const isDuplicate = currentViewTables.some(
    (t: any) => t.table_name === selection.table_name
  )
  
  if (isDuplicate) {
    showError('ไม่สามารถเพิ่ม Table ได้', {
      description: `Table "${selection.table_name}" มีใน View "${viewName}" อยู่แล้ว กรุณาเลือก Table อื่น`
    })
    return
  }
  
  const newViews = {
    ...currentViews,
    [viewName]: [...currentViewTables, {
      table_name: selection.table_name,
      columns: [...selection.columns]
    }]
  }
  setFieldValue('policies.views', newViews)
  
  // Reset selection สำหรับ view นี้
  viewTableSelections.value[viewName] = { table_name: '', columns: [] }
}

const removeTableFromView = (viewName: string, tableIndex: number) => {
  const currentViews = formData.value.policies?.views || {}
  const currentViewTables = currentViews[viewName] || []
  if (currentViewTables.length > 0) {
    const updatedTables = currentViewTables.filter((_: any, i: number) => i !== tableIndex)
    const newViews = {
      ...currentViews,
      [viewName]: updatedTables
    }
    setFieldValue('policies.views', newViews)
  }
}

// Step 5: Runtime Policies - Join Configuration
const setMainTable = (tableName: string) => {
  mainTable.value = tableName
  setFieldValue('policies.runtime.query.from', { table: tableName })
  
  // Set write and delete from table
  setFieldValue('policies.write.query.from', { table: tableName })
  setFieldValue('policies.delete.query.from', { table: tableName })
  
  // Get main table columns for allow_edit
  const mainTableColumns = groupedColumns.value[tableName] || []
  const allowEditColumns = mainTableColumns.map((col: any) => col.name)
  setFieldValue('policies.write.allow_edit', allowEditColumns)
}

const addJoin = () => {
  if (newJoin.value.table && newJoin.value.leftColumn && newJoin.value.rightColumn) {
    const currentJoins = formData.value.policies?.runtime?.query?.joins || []
    
    // Get columns from the joined table to add as projections
    const joinedTableColumns = groupedColumns.value[newJoin.value.table] || []
    const joinProjections = joinedTableColumns.map((col: any) => ({
      column: col.name,
      alias: col.name
    }))
    
    const newJoins = [...currentJoins, {
      type: 'LEFT',
      table_from: mainTable.value,
      table_to: newJoin.value.table,
      condition: {
        column_from: newJoin.value.leftColumn,
        column_to: newJoin.value.rightColumn,
        operator: '='
      },
      relation: 'one_to_one',
      alias: newJoin.value.table.toLowerCase(),
      projections: joinProjections
    }]
    setFieldValue('policies.runtime.query.joins', newJoins)
    
    // Reset
    newJoin.value = { table: '', leftColumn: '', rightColumn: '' }
  }
}

const removeJoin = (index: number) => {
  const currentJoins = formData.value.policies?.runtime?.query?.joins || []
  const newJoins = currentJoins.filter((_: any, i: number) => i !== index)
  setFieldValue('policies.runtime.query.joins', newJoins)
}

const getColumnsForTable = (tableName: string) => {
  return computed(() => {
    const tableColumns = groupedColumns.value[tableName] || []
    return tableColumns.map((col: any) => col.name)
  })
}

const availableJoinTables = computed(() => {
  if (!mainTable.value) return []
  const currentJoins = formData.value.policies?.runtime?.query?.joins || []
  const joinedTables = currentJoins.map((j: any) => j.table_to)
  return availableTables.value.filter(t => t !== mainTable.value && !joinedTables.includes(t))
})

// Check which steps are completed
const isStepCompleted = (step: number): boolean => {
  if (step === 1) {
    const result = step1Schema.safeParse(values)
    return result.success
  }
  if (step === 2) {
    const result = step2Schema.safeParse({ schema: values.schema })
    return result.success
  }
  if (step === 3) {
    // Step 3: Views - ต้องมีอย่างน้อย 1 view
    const viewsCount = Object.keys(values.policies?.views || {}).length
    return viewsCount > 0
  }
  if (step === 4) {
    const result = step3Schema.safeParse({ access_policies: values.access_policies })
    return result.success
  }
  if (step === 5) {
    const result = step4Schema.safeParse({ policies: values.policies })
    return result.success
  }
  return true
}

// Check if user can navigate to a specific step
const canAccessStep = (targetStep: number): boolean => {
  // Always allow going back or staying on current step
  if (targetStep <= currentStep.value) return true
  
  // To go forward, all previous steps must be completed
  for (let i = 1; i < targetStep; i++) {
    if (!isStepCompleted(i)) return false
  }
  return true
}

// Navigation
const goToStep = (step: number) => {
  // Don't allow navigation if step is not accessible
  if (!canAccessStep(step)) {
    let incompleteStep = 0
    for (let i = 1; i < step; i++) {
      if (!isStepCompleted(i)) {
        incompleteStep = i
        break
      }
    }
    
    const stepName = steps.find(s => s.id === incompleteStep)?.title || `Step ${incompleteStep}`
    showError(`กรุณาทำ ${stepName} ให้เสร็จก่อน`, {
      description: 'โปรดกรอกข้อมูลในขั้นตอนก่อนหน้าให้ครบถ้วนก่อนไปขั้นตอนถัดไป'
    })
    return
  }
  
  currentStep.value = step
}

const nextStep = async () => {
  if (!canGoNext.value) {
    showError('กรุณากรอกข้อมูลให้ครบถ้วน', {
      description: 'โปรดตรวจสอบข้อมูลในขั้นตอนนี้อีกครั้ง'
    })
    return
  }
  
  if (currentStep.value < 5) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const closeSheet = () => {
  isOpen.value = false
  setTimeout(() => {
    router.push({ name: ROUTE_NAMES.DATASET_VERSION, params: { id: datasetId.value } })
  }, 300)
}

const onSubmit = async () => {
  try {
    isSubmitting.value = true

    // Validate all steps
    const { valid } = await validate()
    if (!valid) {
      showError('กรุณากรอกข้อมูลให้ครบถ้วน', {
        description: 'โปรดตรวจสอบข้อมูลในทุกขั้นตอนอีกครั้ง'
      })
      return
    }

    // Build write and delete policies based on key_field
    const keyFieldFull = values.policies?.runtime?.key_field
    const mainTable = values.policies?.runtime?.query?.from?.table
    
    if (keyFieldFull && mainTable) {
      // Extract column name from table_name.column_name format
      const keyField = keyFieldFull.includes('.') ? keyFieldFull.split('.')[1] : keyFieldFull
      const keyFieldTable = keyFieldFull.includes('.') ? keyFieldFull.split('.')[0] : mainTable
      
      // Find the key field column details
      const keyFieldColumn = values.schema?.columns?.find(
        col => col.name === keyField && col.table_name === keyFieldTable
      )
      
      if (keyFieldColumn) {
        // Set runtime key_field to just the column name for API
        setFieldValue('policies.runtime.key_field', keyField)
        
        // Set write policy key_field and projections
        setFieldValue('policies.write.key_field', keyField)
        setFieldValue('policies.write.query.projections', [{
          column: keyField,
          alias: keyField
        }])
        
        // Set delete policy key_field and projections
        setFieldValue('policies.delete.key_field', keyField)
        setFieldValue('policies.delete.query.projections', [{
          column: keyField,
          alias: keyField
        }])
      }
    }
    
    await dataApiInstance.post(
      `/v1/datasets/${datasetId.value}/versions`,
      values
    )

    showSuccess('สร้าง Dataset Version สำเร็จ', {
      description: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
    })
//close sheet and refresh page
    isOpen.value = false
    setTimeout(() => {
      router.push({ 
        name: ROUTE_NAMES.DATASET_VERSION, 
        params: { id: datasetId.value },
        query: { refresh: 'true' }
      })
    }, 300)

  } catch (error: any) {
    console.error('Failed to create version:', error)
    showError('ไม่สามารถสร้าง Dataset Version ได้', {
      description: error.response?.data?.error?.message || 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง',
    })
  } finally {
    isSubmitting.value = false
  }
}

// Watch currentStep and auto-load schemas when entering step 2
watch([currentStep, () => values.source_id], ([step, sourceId]) => {
  if (step === 2 && sourceId && schemas.value.length === 0) {
    loadSchemas()
  }
})

onMounted(() => {
  loadSources()
  loadRoles()
})
</script>

<template>
  <Sheet v-model:open="isOpen" @update:open="(open) => !open && closeSheet()">
    <SheetContent class="w-full sm:max-w-3xl p-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>สร้าง Dataset Version</SheetTitle>
        <SheetDescription>Dataset: {{ datasetId }}</SheetDescription>
      </SheetHeader>

      <div class="py-6 space-y-6">
        <!-- Stepper -->
        <Stepper v-model="currentStep" class="flex w-full items-start gap-2">
          <StepperItem v-for="step in steps" :key="step.id" :step="step.id" class="relative flex w-full flex-col items-center justify-center">
            <StepperSeparator v-if="step.id !== steps.length" class="absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary" />
            <StepperTrigger as-child>
              <Button
                :variant="currentStep === step.id ? 'default' : currentStep > step.id ? 'default' : 'outline'"
                size="icon"
                class="z-10 rounded-full shrink-0"
                :class="[
                  currentStep > step.id && 'bg-primary',
                  !canAccessStep(step.id) && 'opacity-50 cursor-not-allowed'
                ]"
                :disabled="!canAccessStep(step.id)"
                @click="canAccessStep(step.id) ? goToStep(step.id) : null"
              >
                <Check v-if="currentStep > step.id" class="h-5 w-5" />
                <span v-else>{{ step.id }}</span>
              </Button>
            </StepperTrigger>
            <div class="mt-2 flex flex-col items-center text-center">
              <StepperTitle 
                :class="[
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground',
                  !canAccessStep(step.id) && currentStep !== step.id ? 'opacity-50' : ''
                ]" 
                class="text-sm font-semibold"
              >
                {{ step.title }}
              </StepperTitle>
              <StepperDescription 
                :class="[
                  !canAccessStep(step.id) && currentStep !== step.id ? 'opacity-50' : ''
                ]"
                class="sr-only md:not-sr-only text-xs text-muted-foreground"
              >
                {{ step.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </Stepper>

        <!-- Step Content -->
        <div class="min-h-[400px]">
          <!-- Step 1: Basic Info -->
          <div v-show="currentStep === 1" class="space-y-4">
            <!-- Version Name -->
            <FormField v-slot="{ componentField }" name="version">
              <FormItem>
                <FormLabel>Version Name <span class="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="v1.0.0" class="font-mono" />
                </FormControl>
                <FormDescription>
                  รูปแบบตัวอย่าง: v1.0.0, v2.1.3
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
            
            <!-- Database -->
            <FormField v-slot="{ componentField }" name="source_id">
              <FormItem>
                <FormLabel>Database <span class="text-red-500">*</span></FormLabel>
                <Select v-bind="componentField" :disabled="isLoadingSources">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Database" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem v-for="source in sources" :key="source.id" :value="source.id">
                      {{ source.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>

            <!-- Status -->
            <FormField v-slot="{ componentField }" name="status">
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน (Active)</SelectItem>
                    <SelectItem value="preview">ตัวอย่าง (Preview)</SelectItem>
                    <SelectItem value="deprecated">เลิกใช้ (Deprecated)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <!-- Step 2: Schema -->
          <div v-show="currentStep === 2" class="space-y-4">
            <div class="rounded-lg border border-muted bg-muted/50 p-4">
              <p class="text-sm text-muted-foreground">
                <strong>คำแนะนำ:</strong> เลือก Schema และ Table จากด้านซ้าย จากนั้นคลิกเพิ่ม Column ที่ต้องการ หรือเพิ่มทั้ง Table
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Left: Table Selection -->
              <div class="space-y-4 border rounded-lg p-4 bg-muted/20">
                <h3 class="font-semibold text-sm">เลือก Table & Columns</h3>
                
                <!-- เลือก Schema -->
                <div class="space-y-2">
                  <Label>Schema <span class="text-red-500">*</span></Label>
                  <Select v-model="selectedSchema" :disabled="!values.source_id || isLoadingSchemas" @update:model-value="loadTables">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Schema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="schema in schemas" :key="schema.schema" :value="schema.schema">
                        {{ schema.schema }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="!values.source_id" class="text-xs text-muted-foreground">กรุณาเลือก Database ใน Step 1 ก่อน</p>
                  <p v-else-if="isLoadingSchemas" class="text-xs text-muted-foreground">กำลังโหลด Schemas...</p>
                  <p v-else-if="schemas.length === 0" class="text-xs text-muted-foreground">ไม่พบ Schema</p>
                </div>

                <!-- เลือก Table -->
                <div class="space-y-2">
                  <Label>Table <span class="text-red-500">*</span></Label>
                  <Select v-model="selectedTable" :disabled="!selectedSchema || isLoadingTables" @update:model-value="loadColumns">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="table in tables" :key="table.table_name" :value="table.table_name">
                        {{ table.table_name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- แสดง Columns -->
                <div v-if="columns.length > 0" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Columns ({{ columns.length }})</Label>
                    <Button @click="addAllColumnsFromTable" size="sm" variant="secondary">
                      <Plus class="h-3 w-3 mr-1" />เพิ่มทั้งหมด
                    </Button>
                  </div>
                  <div class="max-h-80 overflow-y-auto space-y-1 border rounded p-2 bg-background">
                    <div v-for="column in columns" :key="column.column_name" 
                         class="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                         @click="addColumnFromList(column)">
                      <div class="flex-1">
                        <code class="text-sm font-medium">{{ column.column_name }}</code>
                        <span class="text-muted-foreground text-xs ml-2">{{ column.data_type }}</span>
                        <Badge v-if="!column.is_nullable" variant="outline" class="ml-2 text-xs">NOT NULL</Badge>
                      </div>
                      <Plus class="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div v-else-if="selectedTable" class="text-sm text-muted-foreground text-center py-8">
                  กำลังโหลด columns...
                </div>
              </div>

              <!-- Right: Selected Tables & Columns -->
              <div class="space-y-4 border rounded-lg p-4 bg-background">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold text-sm">Tables ที่เลือก</h3>
                  <Badge variant="secondary">{{ Object.keys(groupedColumns).length }} Tables</Badge>
                </div>

                <div v-if="Object.keys(groupedColumns).length > 0" class="space-y-3 max-h-96 overflow-y-auto">
                  <div v-for="(cols, tableName) in groupedColumns" :key="tableName" class="border rounded-lg p-3 space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <code class="text-sm font-semibold">{{ tableName }}</code>
                        <Badge variant="outline" class="text-xs">{{ cols.length }} cols</Badge>
                      </div>
                      <Button @click="removeTableColumns(tableName)" variant="ghost" size="sm" title="ลบ Table นี้">
                        <X class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div class="space-y-1 pl-3">
                      <div v-for="(col, i) in cols" :key="i" 
                           class="flex items-center justify-between text-sm py-1 hover:bg-muted/50 rounded px-2">
                        <div class="flex-1">
                          <code class="text-xs">{{ col.name }}</code>
                          <span class="text-muted-foreground text-xs ml-2">({{ col.type }})</span>
                        </div>
                        <button @click="removeColumn((values.schema?.columns || []).indexOf(col))" 
                                class="text-muted-foreground hover:text-destructive">
                          <X class="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-sm text-muted-foreground text-center py-12">
                  <div class="text-4xl mb-2">📋</div>
                  ยังไม่ได้เลือก columns
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Views -->
          <div v-show="currentStep === 3" class="space-y-4">
            <div class="rounded-lg border border-muted bg-muted/50 p-4">
              <p class="text-sm text-muted-foreground">
                <strong>คำแนะนำ:</strong> สร้าง View จาก Tables และ Columns ที่เลือกใน Step 2
              </p>
            </div>

            <div class="flex gap-2">
              <Input v-model="newViewName" placeholder="ชื่อ View เช่น gender_stats" @keyup.enter="addView" />
              <Button @click="addView" size="sm"><Plus class="h-4 w-4 mr-1" />เพิ่ม View</Button>
            </div>

            <div v-if="Object.keys(values.policies?.views || {}).length" class="space-y-4">
              <div v-for="(tables, viewName) in (values.policies?.views || {})" :key="String(viewName)" class="border rounded p-4 space-y-3 bg-card">
                <div class="flex justify-between items-center">
                  <h3 class="font-semibold">{{ viewName }}</h3>
                  <Button @click="removeView(String(viewName))" variant="ghost" size="sm"><X class="h-4 w-4" /></Button>
                </div>

                <div class="space-y-3">
                  <div class="space-y-2">
                    <Label>เลือก Table <span class="text-red-500">*</span></Label>
                    <Select v-model="viewTableSelections[String(viewName)]!.table_name">
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก Table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem 
                          v-for="table in availableTables" 
                          :key="table" 
                          :value="table"
                          :disabled="isTableInView(String(viewName), table)">
                          {{ table }}
                          <span v-if="isTableInView(String(viewName), table)" class="text-xs text-muted-foreground ml-2">
                            (มีแล้ว)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p v-if="availableTables.length === 0" class="text-xs text-muted-foreground">
                      ไม่มี Table ให้เลือก - กรุณาเพิ่ม Table ใน Step 2 ก่อน
                    </p>
                  </div>

                  <div v-if="viewTableSelections[String(viewName)]?.table_name && getColumnsForViewTable(String(viewName)).value.length > 0" class="space-y-2">
                    <Label>เลือก Columns <span class="text-red-500">*</span></Label>
                    <div class="border rounded p-3 space-y-2 bg-background max-h-60 overflow-y-auto">
                      <div v-for="col in getColumnsForViewTable(String(viewName)).value" :key="col" 
                           class="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
                        <Checkbox 
                          :id="`view-${viewName}-col-${col}`"
                          :model-value="isViewColumnSelected(String(viewName), col)"
                          @update:model-value="() => toggleViewColumn(String(viewName), col)"
                        />
                        <Label :for="`view-${viewName}-col-${col}`" class="flex-1 font-mono text-sm cursor-pointer">
                          {{ col }}
                        </Label>
                      </div>
                    </div>
                    
                    <div v-if="viewTableSelections[String(viewName)]?.columns && viewTableSelections[String(viewName)]!.columns.length > 0" class="flex flex-wrap gap-2 p-2 border rounded bg-primary/5">
                      <span class="text-xs text-muted-foreground">เลือกแล้ว:</span>
                      <Badge v-for="col in viewTableSelections[String(viewName)]!.columns" :key="col" variant="secondary">
                        {{ col }}
                        <button @click="removeViewColumn(String(viewName), col)" class="ml-1"><X class="h-3 w-3" /></button>
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    @click="addTableToView(String(viewName))" 
                    :disabled="!viewTableSelections[String(viewName)]?.table_name || !viewTableSelections[String(viewName)]?.columns?.length"
                    size="sm" 
                    class="w-full">
                    <Plus class="h-4 w-4 mr-1" />เพิ่ม Table เข้า View
                  </Button>
                </div>

                <div v-if="Array.isArray(tables) && tables.length" class="space-y-2 pt-2 border-t">
                  <Label class="text-sm font-medium">Tables ใน View นี้:</Label>
                  <div class="space-y-1">
                    <div v-for="(table, ti) in tables" :key="ti" class="text-sm p-3 bg-muted rounded flex justify-between items-start">
                      <div class="flex-1">
                        <div class="font-semibold font-mono mb-1">{{ (table as any).table_name }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ (table as any).columns.join(', ') }}
                        </div>
                      </div>
                      <button @click="removeTableFromView(String(viewName), ti)" class="text-destructive hover:text-destructive/80">
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Access Policies -->
          <div v-show="currentStep === 4" class="space-y-4">
            <div class="rounded-lg border border-muted bg-muted/50 p-4">
              <p class="text-sm text-muted-foreground">
                <strong>คำแนะนำ:</strong> กำหนดสิทธิ์การเข้าถึงข้อมูลสำหรับแต่ละ Role ว่า Role ไหนสามารถทำอะไรได้บ้าง และสามารถดู Views ไหนได้บ้าง
              </p>
            </div>

            <div class="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h3 class="font-semibold text-sm">สร้าง Policy ใหม่</h3>
                            <div class="space-y-2">
                <Label>Role <span class="text-red-500">*</span></Label>
                <Select v-model="newPolicy.role">
                  <SelectTrigger :disabled="isLoadingRoles">
                    <SelectValue placeholder="เลือก Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <div v-if="isLoadingRoles" class="flex items-center justify-center py-2">
                      <Loader2 class="h-4 w-4 animate-spin" />
                      <span class="ml-2 text-sm text-muted-foreground">กำลังโหลด...</span>
                    </div>
                    <SelectItem 
                      v-else 
                      v-for="role in roles" 
                      :key="role.id" 
                      :value="role.name"
                      class="cursor-pointer"
                    >
                      {{ role.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-3">
                <Label class="text-sm font-medium">สิทธิ์การใช้งาน</Label>
                <div class="grid grid-cols-3 gap-4">
                  <div class="flex items-center space-x-2">
                    <Checkbox 
      :model-value="newPolicy.can_view"
      @update:model-value="(val) => newPolicy.can_view = !!val"
                      id="can_view"
                    />
                    <Label for="can_view" class="font-normal cursor-pointer">Can View</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Checkbox 
      :model-value="newPolicy.can_edit"
      @update:model-value="(val) => newPolicy.can_edit = !!val"
                      id="can_edit" 
                    />
                    <Label for="can_edit" class="font-normal cursor-pointer">Can Edit</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Checkbox 
      :model-value="newPolicy.can_delete"
      @update:model-value="(val) => newPolicy.can_delete = !!val"
                      id="can_delete" 
                    />
                    <Label for="can_delete" class="font-normal cursor-pointer">Can Delete</Label>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <Label class="text-sm font-medium">อนุญาตให้ดู Views <span class="text-red-500">*</span></Label>
                <p class="text-xs text-muted-foreground">เลือก View ที่ Role นี้สามารถเข้าถึงได้</p>
                
                <div v-if="availableViews.length > 0" class="border rounded p-3 space-y-2 bg-background max-h-60 overflow-y-auto">
                  <div v-for="view in availableViews" :key="view" 
                       :class="[
                         'flex items-center space-x-2 p-2 rounded',
                         isViewAlreadyInPolicy(view) 
                           ? 'bg-destructive/10 opacity-60 cursor-not-allowed' 
                           : 'hover:bg-muted cursor-pointer'
                       ]">
                    <Checkbox 
                      :id="`view-${view}`"
                      :model-value="isViewSelected(view)"
                      :disabled="isViewAlreadyInPolicy(view)"
                      @update:model-value="() => toggleViewInPolicy(view)"
                    />
                    <Label 
                      :for="`view-${view}`" 
                      :class="[
                        'flex-1 font-mono text-sm',
                        isViewAlreadyInPolicy(view) ? 'cursor-not-allowed' : 'cursor-pointer'
                      ]">
                      {{ view }}
                      <Badge v-if="isViewAlreadyInPolicy(view)" variant="destructive" class="ml-2 text-xs">
                        มี Policy แล้ว
                      </Badge>
                    </Label>
                  </div>
                </div>
                
                <div v-else class="text-sm text-muted-foreground text-center py-4 border rounded bg-muted/50">
                  ไม่มี View ให้เลือก - กรุณาสร้าง View ใน Step 3 ก่อน
                </div>

                <div v-if="newPolicy.allow_view.length > 0" class="flex flex-wrap gap-2 p-2 border rounded bg-primary/5">
                  <span class="text-xs text-muted-foreground">เลือกแล้ว:</span>
                  <Badge v-for="view in newPolicy.allow_view" :key="view" variant="secondary">
                    {{ view }}
                  </Badge>
                </div>
              </div>

              <Button @click="addPolicy" :disabled="!newPolicy.role || newPolicy.allow_view.length === 0" class="w-full">
                <Plus class="h-4 w-4 mr-1" />เพิ่ม Policy
              </Button>
            </div>

            <!-- แสดง Policies ที่สร้างแล้ว -->
            <div v-if="(values.access_policies || []).length" class="space-y-3">
              <div class="flex items-center justify-between">
                <Label class="text-sm font-medium">Policies ที่สร้างแล้ว</Label>
                <Badge variant="secondary">{{ (values.access_policies || []).length }} policies</Badge>
              </div>
              
              <div class="space-y-2">
                <div v-for="(policy, i) in values.access_policies" :key="i" class="border rounded-lg p-4 space-y-2 bg-card hover:shadow-sm transition-shadow">
                  <div class="flex justify-between items-start">
                    <div class="space-y-1 flex-1">
                      <div class="flex items-center gap-2">
                        <Badge variant="default">{{ policy.role }}</Badge>
                      </div>
                      
                      <div class="flex gap-2 text-xs">
                        <span v-if="policy.can_view" class="text-green-600 dark:text-green-400">✓ View</span>
                        <span v-if="policy.can_edit" class="text-blue-600 dark:text-blue-400">✓ Edit</span>
                        <span v-if="policy.can_delete" class="text-red-600 dark:text-red-400">✓ Delete</span>
                      </div>
                      
                      <div class="flex flex-wrap gap-1 mt-2">
                        <span class="text-xs text-muted-foreground">อนุญาต Views:</span>
                        <Badge v-for="view in policy.allow_view" :key="view" variant="secondary" class="text-xs">
                          {{ view }}
                        </Badge>
                      </div>
                    </div>
                    
                    <Button @click="removePolicy(i)" variant="ghost" size="sm" class="text-destructive hover:text-destructive">
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: Runtime Policies -->
          <div v-show="currentStep === 5" class="space-y-6">
            <div class="rounded-lg border border-muted bg-muted/50 p-4">
              <p class="text-sm text-muted-foreground">
                <strong>คำแนะนำ:</strong> กำหนด Table หลัก และเชื่อม Tables อื่นๆ เข้าด้วยกัน
              </p>
            </div>

            <!-- Default View & Key Field -->
            <div class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ componentField }" name="policies.runtime.default_view">
                <FormItem>
                  <FormLabel>Default View <span class="text-red-500">*</span></FormLabel>
                  <Select v-bind="componentField">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก View" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="view in availableViews" :key="view" :value="view">
                        {{ view }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription class="text-xs">
                    View ที่จะใช้เป็นค่าเริ่มต้น
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="policies.runtime.key_field">
                <FormItem>
                  <FormLabel>Key Field <span class="text-red-500">*</span></FormLabel>
                  <Select v-bind="componentField">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก Column" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem 
                        v-for="col in (values.schema?.columns || [])" 
                        :key="`${col.table_name}.${col.name}`" 
                        :value="`${col.table_name}.${col.name}`"
                        class="cursor-pointer">
                        <span class="font-mono">{{ col.name }}</span>
                        <span class="text-xs text-muted-foreground ml-2">({{ col.table_name }})</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription class="text-xs">
                    Column ที่ใช้ในการค้นหาข้อมูล (เช่น id, email, username)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <div v-if="availableViews.length === 0" class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p class="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ <strong>ยังไม่มี View:</strong> กรุณาสร้าง View ใน Step 3 ก่อน
              </p>
            </div>
            
            <div v-if="(values.schema?.columns || []).length === 0" class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p class="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ <strong>ยังไม่มี Columns:</strong> กรุณาเลือก Columns ใน Step 2 ก่อน
              </p>
            </div>

            <!-- เชื่อม Tables -->
            <div class="space-y-4 border rounded-lg p-4 bg-background">
              <h3 class="font-semibold">เชื่อม Tables เข้าด้วยกัน</h3>
              
              <!-- เลือก Table หลัก -->
              <div class="space-y-2">
                <Label>1. เลือก Table หลัก <span class="text-red-500">*</span></Label>
                <p class="text-xs text-muted-foreground">Table ที่จะดึงข้อมูลหลัก</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    v-for="table in availableTables"
                    :key="table"
                    :variant="mainTable === table ? 'default' : 'outline'"
                    @click="setMainTable(table)"
                    class="justify-start font-mono text-sm h-auto py-3"
                  >
                    <div class="flex flex-col items-start w-full">
                      <span class="font-semibold">{{ table }}</span>
                      <span v-if="mainTable === table" class="text-xs opacity-75">✓ Table หลัก</span>
                    </div>
                  </Button>
                </div>
                <p v-if="availableTables.length === 0" class="text-sm text-muted-foreground text-center py-4 border rounded bg-muted/50">
                  ไม่มี Table - กรุณาเพิ่ม Table ใน Step 2
                </p>
              </div>

              <!-- เพิ่มการเชื่อม -->
              <div v-if="mainTable" class="space-y-4 border-t pt-4">
                <Label>2. เชื่อมกับ Table อื่น (ถ้ามี)</Label>
                <p class="text-xs text-muted-foreground mb-3">เลือก Table ที่ต้องการเชื่อม และระบุ Column ที่ใช้เชื่อม</p>
                
                <div class="grid gap-4 p-4 border rounded-lg bg-muted/20">
                  <!-- เลือก Table ที่จะเชื่อม -->
                  <div class="space-y-2">
                    <Label class="text-sm">Table ที่ต้องการเชื่อม</Label>
                    <Select v-model="newJoin.table">
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก Table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="table in availableJoinTables" :key="table" :value="table">
                          {{ table }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p v-if="availableJoinTables.length === 0" class="text-xs text-muted-foreground">
                      ไม่มี Table ให้เชื่อมเพิ่ม (เชื่อมครบแล้วหรือมี Table เดียว)
                    </p>
                  </div>

                  <!-- เลือก Columns ที่จะเชื่อมกัน -->
                  <div v-if="newJoin.table" class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <Label class="text-sm">Column จาก {{ mainTable }}</Label>
                      <Select v-model="newJoin.leftColumn">
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก Column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="col in getColumnsForTable(mainTable).value" :key="col" :value="col">
                            {{ col }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="space-y-2">
                      <Label class="text-sm">Column จาก {{ newJoin.table }}</Label>
                      <Select v-model="newJoin.rightColumn">
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก Column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="col in getColumnsForTable(newJoin.table).value" :key="col" :value="col">
                            {{ col }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    @click="addJoin" 
                    :disabled="!newJoin.table || !newJoin.leftColumn || !newJoin.rightColumn"
                    size="sm"
                    class="w-full">
                    <Plus class="h-4 w-4 mr-1" />เพิ่มการเชื่อม
                  </Button>
                </div>

                <!-- แสดงการเชื่อมที่สร้างแล้ว -->
                <div v-if="(formData.policies?.runtime?.query?.joins || []).length > 0" class="space-y-2 mt-4">
                  <Label class="text-sm font-medium">การเชื่อมที่สร้างแล้ว:</Label>
                  <div class="space-y-2">
                    <div 
                      v-for="(join, i) in (formData.policies?.runtime?.query?.joins || [])" 
                      :key="i"
                      class="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                      <div class="flex items-center gap-2 text-sm flex-1">
                        <Badge variant="outline" class="font-mono">{{ (join as any).table_from }}</Badge>
                        <span class="text-muted-foreground">→</span>
                        <Badge variant="outline" class="font-mono">{{ (join as any).table_to }}</Badge>
                        <span class="text-xs text-muted-foreground">
                          ผ่าน <code class="bg-muted px-1 py-0.5 rounded">{{ (join as any).condition.column_from }}</code>
                          {{ (join as any).condition.operator }}
                          <code class="bg-muted px-1 py-0.5 rounded">{{ (join as any).condition.column_to }}</code>
                        </span>
                      </div>
                      <Button @click="removeJoin(i)" variant="ghost" size="sm" class="text-destructive">
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- สรุปการตั้งค่า -->
            <div v-if="mainTable" class="rounded-lg border border-primary/50 bg-primary/5 p-4 space-y-2">
              <Label class="text-sm font-semibold">📋 สรุปการตั้งค่า</Label>
              <div class="text-sm space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-muted-foreground">Table หลัก:</span>
                  <Badge variant="default" class="font-mono">{{ mainTable }}</Badge>
                </div>
                <div v-if="(formData.policies?.runtime?.query?.joins || []).length > 0" class="flex items-center gap-2">
                  <span class="text-muted-foreground">เชื่อมกับ:</span>
                  <Badge 
                    v-for="(join, i) in (formData.policies?.runtime?.query?.joins || [])" 
                    :key="i"
                    variant="secondary" 
                    class="font-mono">
                    {{ (join as any).table_to }}
                  </Badge>
                </div>
                <div v-else class="text-xs text-muted-foreground">
                  ยังไม่มีการเชื่อม Table (ไม่จำเป็นถ้าใช้ Table เดียว)
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between pt-6 border-t">
          <Button @click="prevStep" variant="outline" :disabled="currentStep === 1" :class="currentStep === 1 ? '' : 'cursor-pointer'">
            <ChevronLeft class="h-4 w-4 mr-1" />ย้อนกลับ
          </Button>
          
          <div class="flex gap-2">
            <Button @click="closeSheet" variant="outline" :disabled="isSubmitting" :class="isSubmitting ? '' : 'cursor-pointer'">ยกเลิก</Button>
            <Button v-if="currentStep < 5" @click="nextStep" :disabled="!canGoNext" :class="!canGoNext ? '' : 'cursor-pointer'">
              ถัดไป<ChevronRight class="h-4 w-4 ml-1" />
            </Button>
            <Button v-else @click="onSubmit" :disabled="isSubmitting || !canGoNext" :class="(isSubmitting || !canGoNext) ? '' : 'cursor-pointer'">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin mr-2" />
              สร้าง Version
            </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>