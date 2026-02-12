<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useToast } from "@/composables/useToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Search, X } from "lucide-vue-next";
import type {
  AsyncMultiSelectLoader,
  AsyncMultiSelectOption,
} from "./async-multi-select";

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue?: string[];
    disabled?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    loadingText?: string;
    loadingMoreText?: string;
    clearText?: string;
    selectedPrefix?: string;
    listFooterPrefix?: string;
    errorMessage?: string;
    perPage?: number;
    loadOptions: AsyncMultiSelectLoader;
  }>(),
  {
    modelValue: () => [],
    disabled: false,
    placeholder: "ไม่ได้เลือก",
    searchPlaceholder: "ค้นหา...",
    emptyText: "ไม่พบข้อมูล",
    loadingText: "กำลังโหลด...",
    loadingMoreText: "กำลังโหลดเพิ่ม...",
    clearText: "ล้างทั้งหมด",
    selectedPrefix: "เลือกแล้ว",
    listFooterPrefix: "ทั้งหมด",
    errorMessage: "ไม่สามารถโหลดข้อมูลได้",
    perPage: 20,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const { showError } = useToast();

const searchText = ref("");
const options = ref<AsyncMultiSelectOption[]>([]);
const page = ref(1);
const totalPages = ref(1);
const totalRows = ref(0);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const isOpen = ref(false);
const dropdownPlacement = ref<"top" | "bottom">("bottom");
const dropdownMaxHeight = ref(360);
const isAutoFilling = ref(false);

const listRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const selectedValues = computed(() => props.modelValue || []);
const canLoadMore = computed(() => page.value < totalPages.value);

const triggerText = computed(() => {
  if (selectedValues.value.length === 0) return props.placeholder;
  if (selectedValues.value.length === 1) return selectedValues.value[0];
  return `${selectedValues.value[0]} +${selectedValues.value.length - 1}`;
});

const selectedText = computed(() => {
  return `${props.selectedPrefix} ${selectedValues.value.length} รายการ`;
});

const footerText = computed(() => {
  const count = totalRows.value > 0 ? totalRows.value : options.value.length;
  return `${props.listFooterPrefix} ${count} รายการ`;
});

const mergeOptions = (
  current: AsyncMultiSelectOption[],
  incoming: AsyncMultiSelectOption[],
) => {
  const map = new Map<string, AsyncMultiSelectOption>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
};

const loadPage = async (targetPage: number, append: boolean) => {
  if (append) isLoadingMore.value = true;
  else isLoading.value = true;

  try {
    const result = await props.loadOptions({
      page: targetPage,
      per_page: props.perPage,
      search_word: searchText.value || undefined,
    });

    page.value = result.page;
    totalPages.value = result.total_pages || 1;
    totalRows.value = result.total_rows;
    options.value = append
      ? mergeOptions(options.value, result.items)
      : result.items;
  } catch (error: any) {
    console.error("AsyncMultiSelect load error:", error);
    showError(props.errorMessage);
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

const ensureScrollableContent = async () => {
  if (!isOpen.value || isAutoFilling.value || !listRef.value) return;

  isAutoFilling.value = true;
  try {
    await nextTick();

    while (
      isOpen.value &&
      listRef.value &&
      listRef.value.scrollHeight <= listRef.value.clientHeight &&
      page.value < totalPages.value &&
      !isLoading.value &&
      !isLoadingMore.value
    ) {
      await loadPage(page.value + 1, true);
      await nextTick();
    }
  } finally {
    isAutoFilling.value = false;
  }
};

const reload = async () => {
  page.value = 1;
  totalPages.value = 1;
  totalRows.value = 0;
  options.value = [];

  await nextTick();
  if (listRef.value) listRef.value.scrollTop = 0;
  await loadPage(1, false);
};

const loadMore = async () => {
  if (isLoading.value || isLoadingMore.value || !canLoadMore.value) return;
  await loadPage(page.value + 1, true);
};

const onListScroll = async (event: Event) => {
  const el = event.target as HTMLElement;
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
  if (nearBottom) await loadMore();
};

const setSelected = (value: string, checked: boolean) => {
  if (props.disabled) return;

  const current = new Set(selectedValues.value);
  if (checked) current.add(value);
  else current.delete(value);
  emit("update:modelValue", Array.from(current));
};

const toggleByRow = (value: string) => {
  const checked = selectedValues.value.includes(value);
  setSelected(value, !checked);
};

const clearAll = () => {
  if (props.disabled) return;
  emit("update:modelValue", []);
};

const removeSelected = (value: string) => {
  if (props.disabled) return;
  emit(
    "update:modelValue",
    selectedValues.value.filter((selected) => selected !== value),
  );
};

const openDropdown = async () => {
  if (props.disabled) return;
  isOpen.value = true;

  await nextTick();
  updateDropdownPosition();

  if (options.value.length === 0 && !isLoading.value) {
    await loadPage(1, false);
    await ensureScrollableContent();
  }
};

const closeDropdown = () => {
  isOpen.value = false;
};

const toggleDropdown = async () => {
  if (isOpen.value) closeDropdown();
  else await openDropdown();
};

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node;
  if (containerRef.value && !containerRef.value.contains(target)) {
    closeDropdown();
  }
};

const updateDropdownPosition = () => {
  if (!containerRef.value || !isOpen.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const gap = 8;
  const desiredHeight = 380;
  const minUsableHeight = 180;

  const spaceAbove = rect.top - gap;
  const spaceBelow = window.innerHeight - rect.bottom - gap;

  const shouldOpenTop = spaceBelow < minUsableHeight && spaceAbove > spaceBelow;
  dropdownPlacement.value = shouldOpenTop ? "top" : "bottom";

  const available = shouldOpenTop ? spaceAbove : spaceBelow;
  dropdownMaxHeight.value = Math.max(
    120,
    Math.min(desiredHeight, Math.floor(available)),
  );
};

const onViewportChange = () => {
  updateDropdownPosition();
};

let debounceTimer: number | null = null;
watch(
  () => searchText.value,
  () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      reload();
    }, 300);
  },
);

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeDropdown();
  },
);

watch(
  () => isOpen.value,
  async (open) => {
    if (!open) return;
    await nextTick();
    updateDropdownPosition();
  },
);

watch(
  () => [isLoading.value, isLoadingMore.value, options.value.length],
  async () => {
    if (!isOpen.value) return;
    await nextTick();
    updateDropdownPosition();

    if (!isLoading.value && !isLoadingMore.value) {
      await ensureScrollableContent();
    }
  },
);

onMounted(() => {
  window.addEventListener("mousedown", handleOutsideClick);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousedown", handleOutsideClick);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});
</script>

<template>
  <div ref="containerRef" class="relative space-y-2">
    <Label>{{ label }}</Label>

    <button
      type="button"
      class="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <span v-if="selectedValues.length === 0" class="truncate text-sm text-muted-foreground">
        {{ triggerText }}
      </span>
      <div v-else class="flex min-w-0 flex-wrap gap-1.5">
        <Badge
          v-for="selected in selectedValues"
          :key="selected"
          variant="secondary"
          class="inline-flex max-w-[180px] items-center gap-1"
        >
          <span class="truncate">{{ selected }}</span>
          <span
            role="button"
            tabindex="0"
            class="inline-flex shrink-0 cursor-pointer rounded-sm hover:bg-muted"
            @click.stop.prevent="removeSelected(selected)"
            @keydown.enter.stop.prevent="removeSelected(selected)"
            @keydown.space.stop.prevent="removeSelected(selected)"
          >
            <X class="h-3 w-3" />
          </span>
        </Badge>
      </div>
      <ChevronsUpDown class="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>

    <div
      v-if="isOpen"
      ref="panelRef"
      class="absolute left-0 right-0 z-[70] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      :class="
        dropdownPlacement === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
      "
      :style="{
        height: `${dropdownMaxHeight}px`,
        maxHeight: `${dropdownMaxHeight}px`,
      }"
    >
      <div class="flex h-full max-h-full flex-col">
        <div class="border-b p-2">
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="searchText"
              :placeholder="searchPlaceholder"
              class="pl-9"
              :disabled="disabled"
            />
          </div>
        </div>

        <div
          class="flex items-center justify-between bg-muted/50 px-3 py-2 text-sm"
        >
          <span class="font-medium">{{ selectedText }}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-auto px-1 py-0"
            :disabled="disabled || selectedValues.length === 0"
            @click="clearAll"
          >
            {{ clearText }}
          </Button>
        </div>

        <div
          ref="listRef"
          class="min-h-0 flex-1 overflow-y-auto"
          @scroll="onListScroll"
        >
          <div v-if="isLoading" class="px-3 py-4 text-sm text-muted-foreground">
            {{ loadingText }}
          </div>

          <template v-else>
            <div
              v-if="options.length === 0"
              class="px-3 py-4 text-sm text-muted-foreground"
            >
              {{ emptyText }}
            </div>

            <div
              v-for="option in options"
              :key="option.id"
              class="flex cursor-pointer items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40"
              @click="toggleByRow(option.value)"
            >
              <Checkbox
                :model-value="selectedValues.includes(option.value)"
                :disabled="disabled"
                class="self-center"
                @click.stop
                @update:model-value="
                  (value: boolean | 'indeterminate') =>
                    setSelected(option.value, value === true)
                "
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ option.label }}</p>
                <p
                  v-if="option.description"
                  class="text-xs text-muted-foreground"
                >
                  {{ option.description }}
                </p>
              </div>
            </div>

            <div
              v-if="isLoadingMore"
              class="px-3 py-2 text-xs text-muted-foreground"
            >
              {{ loadingMoreText }}
            </div>
          </template>
        </div>

        <div
          class="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground"
        >
          {{ footerText }}
        </div>
      </div>
    </div>
  </div>
</template>
