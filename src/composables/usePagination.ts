import { computed, toRef } from "vue";
import type { Ref } from "vue";

export interface PaginationData {
  page: number;
  per_page: number;
  total_pages: number;
  total_rows: number;
}

export function usePagination(
  paginationRef: Ref<PaginationData> | PaginationData
) {
  const pagination = toRef(paginationRef);

  const canPreviousPage = computed(() => {
    return pagination.value.page > 1;
  });

  const canNextPage = computed(() => {
    return pagination.value.page < pagination.value.total_pages;
  });

  const getVisiblePages = computed(() => {
    const totalPages = pagination.value.total_pages;
    const currentPage = pagination.value.page;
    const pages: (number | string)[] = [];

    if (totalPages <= 0) return [];

    // Always show first page
    pages.push(1);

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      if (currentPage <= 4) {
        // Show 1, 2, 3, 4, 5, ..., last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        if (totalPages > 6) {
          pages.push("...");
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Show 1, ..., last-4, last-3, last-2, last-1, last
        if (totalPages > 6) {
          pages.push("...");
        }
        for (let i = totalPages - 4; i <= totalPages; i++) {
          if (i > 1) pages.push(i);
        }
      } else {
        // Show 1, ..., current-1, current, current+1, ..., last
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return [...new Set(pages)]; // Remove duplicates
  });

  const getPaginationInfo = computed(() => {
    const currentPage = pagination.value.page;
    const perPage = pagination.value.per_page;
    const totalRows = pagination.value.total_rows;

    if (totalRows === 0) {
      return {
        start: 0,
        end: 0,
        total: 0,
        text: "ไม่มีข้อมูล",
      };
    }

    const start = (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, totalRows);

    return {
      start,
      end,
      total: totalRows,
      text: `แสดง ${start} ถึง ${end} จากทั้งหมด ${totalRows} รายการ`,
    };
  });

  return {
    pagination,
    getVisiblePages,
    getPaginationInfo,
    canPreviousPage,
    canNextPage,
  };
}
