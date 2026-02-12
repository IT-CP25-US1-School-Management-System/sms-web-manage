<script setup lang="ts">
import { authApiInstance } from "@/stores/api";
import type { Roles } from "@/types/roles";
import AsyncMultiSelectDropdown from "@/components/common/AsyncMultiSelectDropdown.vue";
import type {
  AsyncMultiSelectLoadParams,
  AsyncMultiSelectPageResult,
} from "@/components/common/async-multi-select";

interface RolesApiShape {
  data?: unknown;
  page?: number;
  total_pages?: number;
  total_rows?: number;
}

withDefaults(
  defineProps<{
    modelValue?: string[];
    disabled?: boolean;
  }>(),
  {
    modelValue: () => [],
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const parseRolesResponse = (payload: RolesApiShape) => {
  const directData = Array.isArray(payload?.data) ? payload.data : null;
  const wrapped = payload?.data as RolesApiShape | undefined;
  const wrappedData = Array.isArray(wrapped?.data) ? wrapped.data : null;

  const roles = (directData || wrappedData || []) as Roles[];
  const page = payload.page ?? wrapped?.page ?? 1;
  const totalPages = payload.total_pages ?? wrapped?.total_pages ?? 1;
  const totalRows = payload.total_rows ?? wrapped?.total_rows ?? roles.length;

  return {
    roles,
    page,
    totalPages,
    totalRows,
  };
};

const loadRoles = async (
  params: AsyncMultiSelectLoadParams
): Promise<AsyncMultiSelectPageResult> => {
  const response = await authApiInstance.get<RolesApiShape>("/v1/auth/roles", {
    params,
  });

  const parsed = parseRolesResponse(response.data);

  return {
    items: parsed.roles.map((role) => ({
      id: role.id,
      value: role.name,
      label: role.name,
      description: role.description,
    })),
    page: parsed.page,
    total_pages: parsed.totalPages,
    total_rows: parsed.totalRows,
  };
};

const onUpdate = (value: string[]) => {
  emit("update:modelValue", value);
};
</script>

<template>
  <AsyncMultiSelectDropdown
    label="Roles ที่อนุญาต"
    :model-value="modelValue"
    :disabled="disabled"
    placeholder="ไม่เลือกจะเข้าได้เเต่ผู้ดูเเลระบบเท่านั้น"
    search-placeholder="ค้นหา role..."
    empty-text="ไม่พบ role"
    loading-text="กำลังโหลด roles..."
    loading-more-text="กำลังโหลด roles เพิ่ม..."
    selected-prefix="เลือกแล้ว"
    list-footer-prefix="ทั้งหมด"
    error-message="ไม่สามารถโหลดข้อมูล roles ได้"
    :per-page="5"
    :load-options="loadRoles"
    @update:model-value="onUpdate"
  />
</template>
