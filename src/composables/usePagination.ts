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

  const getVisiblePages = computed(() => {
    const totalPages = pagination.value.total_pages;
    const currentPage = pagination.value.page;
    const pages: (number | string)[] = [];

    if (totalPages <= 0) return [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
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
    getVisiblePages,
    getPaginationInfo,
  };
}
