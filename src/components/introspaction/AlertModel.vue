<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { Columns, Tables, Schemas } from "@/types/database";

interface Props {
  open: boolean;
  type: "column" | "table" | "schema";
  selectedColumn?: Columns | null;
  selectedTable?: Tables | null;
  selectedSchema?: Schemas | null;
}

interface Emits {
  (e: "update:open", value: boolean): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleOpenChange = (value: boolean) => {
  emit("update:open", value);
};
</script>
<template>
  <AlertDialog :open="open" @update:open="handleOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          รายละเอียด
          {{
            type === "schema" ? "Schema" : type === "table" ? "Table" : "Column"
          }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          ข้อมูลทั้งหมดของ
          {{
            type === "schema" ? "Schema" : type === "table" ? "Table" : "Column"
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <!-- Schema Details -->
      <div v-if="type === 'schema' && selectedSchema" class="grid gap-3 py-4">
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Schema ID:</span>
          <span class="col-span-2">{{ selectedSchema.id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Sources ID:</span>
          <span class="col-span-2">{{ selectedSchema.sources_id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Schema:</span>
          <span class="col-span-2">{{ selectedSchema.schema }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Created At:</span>
          <span class="col-span-2">{{ selectedSchema.created_at }}</span>
        </div>
      </div>

      <!-- Table Details -->
      <div v-if="type === 'table' && selectedTable" class="grid gap-3 py-4">
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Table ID:</span>
          <span class="col-span-2">{{ selectedTable.id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Sources ID:</span>
          <span class="col-span-2">{{ selectedTable.sources_id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Schema:</span>
          <span class="col-span-2">{{ selectedTable.schema }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Table Name:</span>
          <span class="col-span-2">{{ selectedTable.table_name }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Created At:</span>
          <span class="col-span-2">{{ selectedTable.created_at }}</span>
        </div>
      </div>

      <!-- Column Details -->
      <div v-if="type === 'column' && selectedColumn" class="grid gap-3 py-4">
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Column ID:</span>
          <span class="col-span-2">{{ selectedColumn.id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Sources ID:</span>
          <span class="col-span-2">{{ selectedColumn.sources_id }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Schema:</span>
          <span class="col-span-2">{{ selectedColumn.schema }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Table Name:</span>
          <span class="col-span-2">{{ selectedColumn.table_name }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Column Name:</span>
          <span class="col-span-2">{{ selectedColumn.column_name }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Data Type:</span>
          <span class="col-span-2">
            <Badge>{{ selectedColumn.data_type }}</Badge>
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Is Nullable:</span>
          <span class="col-span-2">{{ selectedColumn.is_nullable }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Column Default:</span>
          <span class="col-span-2">{{
            selectedColumn.column_default || "-"
          }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Ordinal Position:</span>
          <span class="col-span-2">{{ selectedColumn.ordinal_position }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-semibold">Created At:</span>
          <span class="col-span-2">{{ selectedColumn.created_at }}</span>
        </div>
      </div>
      <div class="flex justify-end">
        <AlertDialogCancel>ปิด</AlertDialogCancel>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
<style></style>
